// src/pages/Analytics.jsx
import {
  doc,
  getDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { auth, db } from "../firebase/firebase";

const CATEGORY_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#e11d48",
  "#a855f7",
  "#facc15",
  "#64748b",
];

// Neon mint accent (your choice: option 2)
const ACCENT_MAIN = "#22c55e";

function formatMonthKey(dateStr) {
  // dateStr: "2025-12-01"
  if (typeof dateStr !== "string" || dateStr.length < 7) return null;
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function formatMonthLabel(key) {
  if (!key) return "";
  const [year, month] = key.split("-");
  const m = parseInt(month, 10) - 1;
  const short =
    [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][m] || month;
  return `${short} ${year}`;
}

// Generate last N months keys like "2025-11"
function getLastNMonths(n = 12) {
  const result = [];
  const now = new Date();

  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
    result.push({
      key,
      label: formatMonthLabel(key),
    });
  }

  // newest first in result; we’ll reverse when needed
  return result;
}

function normalizeId(id) {
  return String(id || "").toLowerCase().trim();
}

export default function Analytics() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // filters
  const [rangeMonths, setRangeMonths] = useState(6); // 3 / 6 / 12
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  const last12Months = useMemo(() => getLastNMonths(12), []);
  const monthKeysNewestFirst = last12Months.map((m) => m.key);

  // 1) Load user data
  useEffect(() => {
    const load = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setErrorMsg("You must be logged in to view analytics.");
          setLoading(false);
          return;
        }

        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setErrorMsg("User data not found.");
          setLoading(false);
          return;
        }

        setUserData({ id: snap.id, ...snap.data() });
      } catch (err) {
        console.error("Failed to load analytics data:", err);
        setErrorMsg("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // 2) Basic extracted data
  const rawBudgets = userData?.budgets || {};
  const categories = (rawBudgets.categories || []).map((c) => ({
    ...c,
    id: normalizeId(c.id),
  }));
  const spending = userData?.spending || {};
  const monthlyTrends = userData?.monthlyTrends || {};
  const monthlyIncome = Number(rawBudgets.monthlyIncome || 0);

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [categories]);

  // 3) Normalized transactions
  const allTransactions = useMemo(
    () =>
      Object.values(spending).map((tx) => {
        const amount = Number(tx.amount || 0);
        const dateStr = tx.date || "";
        const ymKey = formatMonthKey(dateStr);
        const normCategory = normalizeId(tx.category || "uncategorized");
        const dateObj = new Date(dateStr);
        const weekday = isNaN(dateObj.getTime()) ? null : dateObj.getDay(); // 0-6
        const isWeekend = weekday === 0 || weekday === 6;

        return {
          ...tx,
          amount,
          dateStr,
          ymKey,
          categoryId: normCategory,
          weekday,
          isWeekend,
        };
      }),
    [spending],
  );

  // Filtered months (based on selected range)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredMonthKeys = useMemo(() => {
    const slice = monthKeysNewestFirst.slice(0, rangeMonths);
    return slice
      .filter((key) =>
        Object.values(spending).some((tx) =>
          typeof tx.date === "string" ? tx.date.startsWith(key) : false,
        ),
      )
      .reverse(); // oldest → newest for charts
  }, [monthKeysNewestFirst, rangeMonths, Object.values(spending)]);

  // helper: category display name
  const getCategoryName = (id) => {
    if (id === "all") return "All categories";
    const norm = normalizeId(id);
    const found = categoryMap[norm];
    return found?.name || id || "Uncategorized";
  };

  // Transactions limited to selected months (for period-level analytics)
  const filteredTransactions = useMemo(
    () =>
      allTransactions.filter(
        (tx) => tx.ymKey && filteredMonthKeys.includes(tx.ymKey),
      ),
    [allTransactions, filteredMonthKeys],
  );

  // 4) Category deep-dive data (Hybrid B)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const categoryMonthlyData = useMemo(() => {
    // build map month -> { monthLabel, total, [catId]: amount }
    const monthAgg = {};

    filteredMonthKeys.forEach((ymKey) => {
      monthAgg[ymKey] = {
        ymKey,
        monthLabel: formatMonthLabel(ymKey),
        total: 0,
      };
      categories.forEach((c) => {
        monthAgg[ymKey][c.id] = 0;
      });
    });

    filteredTransactions.forEach((tx) => {
      if (!tx.ymKey || !monthAgg[tx.ymKey]) return;

      const catId = tx.categoryId;
      monthAgg[tx.ymKey].total += tx.amount;

      if (!(catId in monthAgg[tx.ymKey])) {
        monthAgg[tx.ymKey][catId] = 0;
      }
      monthAgg[tx.ymKey][catId] += tx.amount;
    });

    return Object.values(monthAgg);
  }, [filteredTransactions, filteredMonthKeys, categories]);

  // Selected category stats (Hybrid B)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedCategoryStats = useMemo(() => {
    if (!filteredMonthKeys.length) return null;

    let total = 0;
    let count = 0;
    let bestMonthKey = null;
    let bestMonthAmount = 0;

    filteredMonthKeys.forEach((ymKey) => {
      let monthAmount = 0;
      filteredTransactions.forEach((tx) => {
        if (tx.ymKey !== ymKey) return;
        if (
          selectedCategoryId !== "all" &&
          tx.categoryId !== selectedCategoryId
        )
          return;
        monthAmount += tx.amount;
        total += tx.amount;
        count += 1;
      });

      if (monthAmount > bestMonthAmount) {
        bestMonthAmount = monthAmount;
        bestMonthKey = ymKey;
      }
    });

    const avgPerMonth =
      filteredMonthKeys.length > 0 ? total / filteredMonthKeys.length : 0;
    const avgPerTx = count > 0 ? total / count : 0;

    return {
      total,
      avgPerMonth,
      avgPerTx,
      bestMonthKey,
      bestMonthAmount,
    };
  }, [filteredTransactions, filteredMonthKeys, selectedCategoryId]);

  // 5) Time-pattern insights (Hybrid C)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const timePatternData = useMemo(() => {
    const weekdayAgg = {
      weekday: { label: "Weekdays", count: 0, amount: 0 },
      weekend: { label: "Weekends", count: 0, amount: 0 },
    };

    const avgTicketPerMonthMap = {};
    filteredMonthKeys.forEach((ymKey) => {
      avgTicketPerMonthMap[ymKey] = { ymKey, total: 0, count: 0 };
    });

    filteredTransactions.forEach((tx) => {
      if (!tx.ymKey || !filteredMonthKeys.includes(tx.ymKey)) return;
      // weekend vs weekday
      if (tx.isWeekend) {
        weekdayAgg.weekend.count += 1;
        weekdayAgg.weekend.amount += tx.amount;
      } else {
        weekdayAgg.weekday.count += 1;
        weekdayAgg.weekday.amount += tx.amount;
      }

      // avg ticket per month
      const record = avgTicketPerMonthMap[tx.ymKey];
      if (record) {
        record.total += tx.amount;
        record.count += 1;
      }
    });

    const weekdayVsWeekend = [
      {
        name: "Weekdays",
        amount: weekdayAgg.weekday.amount,
      },
      {
        name: "Weekends",
        amount: weekdayAgg.weekend.amount,
      },
    ];

    const avgTicketPerMonth = Object.values(avgTicketPerMonthMap).map(
      (r) => ({
        monthLabel: formatMonthLabel(r.ymKey),
        avg: r.count > 0 ? r.total / r.count : 0,
      }),
    );

    // cumulative over time for area chart
    let running = 0;
    const cumulativeSpend = filteredMonthKeys.map((ymKey) => {
      const monthTotal =
        Number(monthlyTrends?.[ymKey] || 0) ||
        filteredTransactions
          .filter((tx) => tx.ymKey === ymKey)
          .reduce((s, tx) => s + tx.amount, 0);
      running += monthTotal;
      return {
        monthLabel: formatMonthLabel(ymKey),
        total: monthTotal,
        cumulative: running,
      };
    });

    return {
      weekdayVsWeekend,
      avgTicketPerMonth,
      cumulativeSpend,
    };
  }, [filteredTransactions, filteredMonthKeys, Object.values(monthlyTrends)]);

  // 6) Goal / scenario projections (Hybrid D)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const projection = useMemo(() => {
    if (!filteredMonthKeys.length) return null;

    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const today = now.getDate();

    const thisMonthKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}`;

    let thisMonthSpend = 0;
    allTransactions.forEach((tx) => {
      if (tx.ymKey === thisMonthKey) {
        thisMonthSpend += tx.amount;
      }
    });

    const dailyRateSoFar =
      today > 0 ? thisMonthSpend / today : thisMonthSpend;
    const projectedEndOfMonth = dailyRateSoFar * daysInMonth;

    const totalCategoryBudget = categories.reduce(
      (sum, cat) => sum + Number(cat.amount || 0),
      0,
    );
    const fallbackBudget = Math.max(monthlyIncome, 0);
    const monthlyBudget =
      totalCategoryBudget || fallbackBudget || projectedEndOfMonth || 1;

    const remainingBudget = Math.max(monthlyBudget - thisMonthSpend, 0);
    const remainingDays = Math.max(daysInMonth - today, 1);
    const safeSpendPerDay = remainingBudget / remainingDays;

    // simple scenario: reduce top category 20%
    const categoryTotals = {};
    allTransactions.forEach((tx) => {
      if (tx.ymKey === thisMonthKey) {
        const cat = tx.categoryId;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
      }
    });
    const topCatId =
      Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      null;
    const topCatName = topCatId ? getCategoryName(topCatId) : null;
    const topCatTotal = topCatId ? categoryTotals[topCatId] : 0;
    const potentialSavings = topCatTotal * 0.2; // 20%

    return {
      thisMonthSpend,
      dailyRateSoFar,
      projectedEndOfMonth,
      monthlyBudget,
      remainingBudget,
      safeSpendPerDay,
      topCatName,
      potentialSavings,
    };
  }, [allTransactions, categories, monthlyIncome, getCategoryName]);

  // 7) Budget health score (0–100) for selected range
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const budgetHealth = useMemo(() => {
    if (!filteredMonthKeys.length) return null;

    const periodMonths = filteredMonthKeys.length;

    const totalPeriodSpend = filteredTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );

    if (totalPeriodSpend === 0) {
      return {
        score: 80,
        label: "Getting started",
        description:
          "No spending recorded yet in this range. As you add transactions, we’ll tune this score.",
      };
    }

    const expectedBudget =
      monthlyIncome > 0 ? monthlyIncome * periodMonths : totalPeriodSpend || 1;
    const ratio = totalPeriodSpend / expectedBudget;

    // Simple heuristic: lower ratio → better score
    let rawScore = 100 - ratio * 40;
    if (ratio < 0.5) rawScore += 10;
    rawScore = Math.max(5, Math.min(95, Math.round(rawScore)));

    let label = "Balanced";
    let description =
      "Your spending and income are reasonably balanced over this period.";

    if (rawScore >= 85) {
      label = "Excellent";
      description =
        "You’re well under your effective budget. Strong savings behavior in this range.";
    } else if (rawScore >= 70) {
      label = "Good";
      description =
        "Spending is mostly under control. A few tweaks could push you into an excellent zone.";
    } else if (rawScore >= 50) {
      label = "Watch";
      description =
        "You’re close to your effective budget. Keep an eye on big purchases.";
    } else {
      label = "Critical";
      description =
        "Spending is above your effective budget. Consider tightening a few categories.";
    }

    return {
      score: rawScore,
      label,
      description,
      totalPeriodSpend,
      periodMonths,
    };
  }, [filteredMonthKeys, filteredTransactions, monthlyIncome]);

  // 8) Category balance radar data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const radarData = useMemo(() => {
    if (!filteredTransactions.length) return [];

    const perCat = {};
    let total = 0;

    filteredTransactions.forEach((tx) => {
      const catId = tx.categoryId;
      perCat[catId] = (perCat[catId] || 0) + tx.amount;
      total += tx.amount;
    });

    if (total === 0) return [];

    return Object.entries(perCat).map(([catId, amt]) => ({
      category: getCategoryName(catId),
      value: (amt / total) * 100,
    }));
  }, [filteredTransactions, getCategoryName]);

  // 9) Month comparison (this month vs previous month in range)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const monthComparisonData = useMemo(() => {
    if (filteredMonthKeys.length < 2) return [];

    const m2 = filteredMonthKeys[filteredMonthKeys.length - 1]; // latest
    const m1 = filteredMonthKeys[filteredMonthKeys.length - 2]; // previous

    const totalFor = (ymKey) =>
      filteredTransactions
        .filter((tx) => tx.ymKey === ymKey)
        .reduce((sum, tx) => sum + tx.amount, 0);

    const amt1 = totalFor(m1);
    const amt2 = totalFor(m2);

    return [
      {
        monthLabel: formatMonthLabel(m1),
        amount: amt1,
      },
      {
        monthLabel: formatMonthLabel(m2),
        amount: amt2,
      },
    ];
  }, [filteredMonthKeys, filteredMonthKeys.length, filteredTransactions]);

  // 10) Heatmap: months x weekdays
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const heatmapData = useMemo(() => {
    if (!filteredMonthKeys.length) return { rows: [], maxVal: 0 };

    const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const rows = filteredMonthKeys.map((ymKey) => {
      const vals = new Array(7).fill(0);
      filteredTransactions.forEach((tx) => {
        if (tx.ymKey === ymKey && tx.weekday !== null) {
          vals[tx.weekday] += tx.amount;
        }
      });
      return {
        ymKey,
        monthLabel: formatMonthLabel(ymKey),
        values: vals,
      };
    });

    let maxVal = 0;
    rows.forEach((row) => {
      row.values.forEach((v) => {
        if (v > maxVal) maxVal = v;
      });
    });

    return { rows, maxVal, weekdayLabels };
  }, [filteredMonthKeys, filteredTransactions]);

  // 11) Lightweight “AI-style” summary (no external AI, just logic)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const aiSummary = useMemo(() => {
    if (!budgetHealth || !filteredMonthKeys.length) {
      return "Once you have some spending history, we’ll summarize your habits here in plain English.";
    }

    const { score, totalPeriodSpend, periodMonths } = budgetHealth;
    const rangeLabel =
      rangeMonths === 3
        ? "the last 3 months"
        : rangeMonths === 6
        ? "the last 6 months"
        : "the last 12 months";

    // Top category
    const perCat = {};
    filteredTransactions.forEach((tx) => {
      perCat[tx.categoryId] = (perCat[tx.categoryId] || 0) + tx.amount;
    });
    let topCatId = null;
    let topCatVal = 0;
    Object.entries(perCat).forEach(([id, amt]) => {
      if (amt > topCatVal) {
        topCatVal = amt;
        topCatId = id;
      }
    });
    const topCatName = topCatId ? getCategoryName(topCatId) : null;

    // Weekends share
    let weekendTotal = 0;
    let weekdayTotal = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.isWeekend) weekendTotal += tx.amount;
      else weekdayTotal += tx.amount;
    });
    const total = weekendTotal + weekdayTotal || 1;
    const weekendShare = Math.round((weekendTotal / total) * 100);

    const avgPerMonth =
      periodMonths > 0 ? totalPeriodSpend / periodMonths : totalPeriodSpend;

    return [
      `Over ${rangeLabel}, you’ve spent about $${totalPeriodSpend.toFixed(
        2,
      )} in total (≈ $${avgPerMonth.toFixed(2)} per month).`,
      topCatName
        ? `Most of your spending is concentrated in ${topCatName}, which might be a good category to watch.`
        : null,
      `Roughly ${weekendShare}% of your spending happens on weekends, and your overall budget health score is ${score}/100.`,
    ]
      .filter(Boolean)
      .join(" ");
  }, [budgetHealth, filteredMonthKeys, filteredTransactions, rangeMonths, getCategoryName]);

  // ------------- UI --------------

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">Analytics</h1>
        <p>Loading your analytics…</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">Analytics</h1>
        <p className="text-red-600">{errorMsg}</p>
      </div>
    );
  }

  const { weekdayVsWeekend, avgTicketPerMonth, cumulativeSpend } =
    timePatternData;
  const { rows: heatmapRows, maxVal: heatmapMax, weekdayLabels } =
    heatmapData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-xs text-gray-500">
            Deep-dive into your spending patterns, categories, and goals.
          </p>
        </div>
      </div>

      {/* Filters strip */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Range selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-gray-400">
            Time range
          </span>
          <div className="flex gap-1">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setRangeMonths(m)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  rangeMonths === m
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Last {m}m
              </button>
            ))}
          </div>
        </div>

        {/* Category selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-gray-400">
            Category focus
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategoryId("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              selectedCategoryId === "all"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {categories.map((cat, index) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedCategoryId === cat.id
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={{
                borderColor:
                  CATEGORY_COLORS[index % CATEGORY_COLORS.length],
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION A: Overview row – Budget health + AI summary + Radar */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* A1: Budget health score */}
        <div className="rounded-2xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-sm transition hover:shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Budget health</h2>
              <p className="text-[11px] text-slate-300">
                Overall strength of your spending vs income.
              </p>
            </div>
          </div>
          {budgetHealth ? (
            <div className="mt-2 flex items-center gap-4">
              <div className="relative flex h-20 w-20 items-center justify-center">
                {/* Ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/40 via-emerald-400/70 to-emerald-500/40 blur-sm" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-900/80 border border-emerald-400/40">
                  <span className="text-xl font-semibold">
                    {budgetHealth.score}
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-1 text-xs text-slate-200">
                <div className="text-sm font-semibold">
                  {budgetHealth.label}
                </div>
                <p className="text-[11px] text-slate-300">
                  {budgetHealth.description}
                </p>
                <p className="text-[11px] text-slate-400">
                  Total in this range: $
                  {budgetHealth.totalPeriodSpend.toFixed(2)} across{" "}
                  {budgetHealth.periodMonths} month
                  {budgetHealth.periodMonths === 1 ? "" : "s"}.
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-300">
              Start adding transactions to see your budget health score.
            </p>
          )}
        </div>

        {/* A2: AI-style summary */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
          <h2 className="mb-1 text-sm font-semibold">
            Smart summary of your habits
          </h2>
          <p className="text-[11px] text-gray-500 mb-2">
            A quick narrative based on your data (no external AI used).
          </p>
          <p className="text-xs text-gray-700 leading-relaxed">
            {aiSummary}
          </p>
        </div>

        {/* A3: Radar – balance of spending */}
        <div className="rounded-2xl border bg-slate-950 p-4 text-white shadow-sm transition hover:shadow-md">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Balance of spending by category
            </h2>
            <span className="text-[10px] uppercase text-slate-400">
              Share of total
            </span>
          </div>
          {radarData.length === 0 ? (
            <p className="mt-2 text-xs text-slate-300">
              Once you have spending across categories in this range,
              you’ll see their balance here.
            </p>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="Share"
                    dataKey="value"
                    stroke={ACCENT_MAIN}
                    fill={ACCENT_MAIN}
                    fillOpacity={0.4}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toFixed(1)}%`,
                      "Share of total",
                    ]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* SECTION B: Category Deep Dive */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Stacked bar / per month */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                Category spending over time
              </h2>
              <p className="text-xs text-gray-500">
                Monthly totals
                {selectedCategoryId !== "all" && (
                  <>
                    {" "}
                    for{" "}
                    <span className="font-medium">
                      {getCategoryName(selectedCategoryId)}
                    </span>
                  </>
                )}{" "}
                over the selected range.
              </p>
            </div>
          </div>

          {categoryMonthlyData.length === 0 ? (
            <p className="text-sm text-gray-500">
              We’ll show data here once you have transactions in this
              time range.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryMonthlyData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" />
                  <YAxis
                    tickFormatter={(v) => `$${v}`}
                    domain={[0, "dataMax + 50"]}
                  />
                  <Tooltip
                    formatter={(value) => `$${Number(value).toFixed(2)}`}
                  />
                  <Legend />
                  {selectedCategoryId === "all"
                    ? categories.map((cat, index) => (
                        <Bar
                          key={cat.id}
                          dataKey={cat.id}
                          name={cat.name}
                          stackId="a"
                          radius={[4, 4, 0, 0]}
                          fill={
                            CATEGORY_COLORS[
                              index % CATEGORY_COLORS.length
                            ]
                          }
                        />
                      ))
                    : categories
                        .filter((c) => c.id === selectedCategoryId)
                        .map((cat, index) => (
                          <Bar
                            key={cat.id}
                            dataKey={cat.id}
                            name={cat.name}
                            radius={[4, 4, 0, 0]}
                            fill={
                              CATEGORY_COLORS[
                                index % CATEGORY_COLORS.length
                              ]
                            }
                          />
                        ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category stats card */}
        <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
          <h2 className="text-sm font-semibold">
            {getCategoryName(selectedCategoryId)} snapshot
          </h2>
          {selectedCategoryStats ? (
            <>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-baseline justify-between">
                  <span>Total spent in range</span>
                  <span className="text-base font-semibold text-gray-900">
                    ${selectedCategoryStats.total.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span>Average per month</span>
                  <span className="font-medium">
                    ${selectedCategoryStats.avgPerMonth.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span>Average per transaction</span>
                  <span className="font-medium">
                    ${selectedCategoryStats.avgPerTx.toFixed(2)}
                  </span>
                </div>
                {selectedCategoryStats.bestMonthKey && (
                  <div className="flex items-baseline justify-between">
                    <span>Highest month</span>
                    <span className="font-medium">
                      {formatMonthLabel(
                        selectedCategoryStats.bestMonthKey,
                      )}{" "}
                      (${selectedCategoryStats.bestMonthAmount.toFixed(2)})
                    </span>
                  </div>
                )}
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                Tip: switch time range or category to compare patterns.
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-500">
              Not enough data yet to compute stats.
            </p>
          )}
        </div>
      </div>

      {/* SECTION C: Time-based patterns */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* C1: Cumulative area + monthly total */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                Monthly &amp; cumulative spending
              </h2>
              <p className="text-xs text-gray-500">
                See how your total spend has evolved over time.
              </p>
            </div>
          </div>
          {cumulativeSpend.length === 0 ? (
            <p className="text-sm text-gray-500">
              We’ll show this once you have spending across multiple
              months.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={cumulativeSpend}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" />
                  <YAxis
                    tickFormatter={(v) => `$${v}`}
                    domain={[0, "dataMax + 50"]}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `$${Number(value).toFixed(2)}`,
                      name === "total"
                        ? "This month"
                        : "Cumulative total",
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Monthly total"
                    fill="#bfdbfe"
                    stroke="#60a5fa"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative"
                    fill="#dcfce7"
                    stroke={ACCENT_MAIN}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* C2: Weekday vs weekend + avg ticket */}
        <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
          {/* Weekday vs weekend */}
          <div>
            <h3 className="text-xs font-semibold text-gray-700">
              Weekday vs weekend spending
            </h3>
            <p className="mb-1 text-[11px] text-gray-500">
              Total spent in the selected range.
            </p>
            {weekdayVsWeekend.every((d) => d.amount === 0) ? (
              <p className="text-xs text-gray-500">
                Not enough data yet.
              </p>
            ) : (
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayVsWeekend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value) => `$${Number(value).toFixed(2)}`}
                    />
                    <Bar
                      dataKey="amount"
                      radius={[4, 4, 0, 0]}
                      fill="#6366f1"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Avg ticket per month */}
          <div>
            <h3 className="text-xs font-semibold text-gray-700">
              Average transaction size
            </h3>
            <p className="mb-1 text-[11px] text-gray-500">
              Higher bars mean larger typical purchases.
            </p>
            {avgTicketPerMonth.every((d) => d.avg === 0) ? (
              <p className="text-xs text-gray-500">
                Not enough data yet.
              </p>
            ) : (
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={avgTicketPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthLabel" />
                    <YAxis tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value) => `$${Number(value).toFixed(2)}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION D: Goals & scenarios */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Projection */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
          <h2 className="text-sm font-semibold">
            This month projection
          </h2>
          {projection ? (
            <>
              <p className="mt-1 text-xs text-gray-500">
                Based on your current daily pace.
              </p>
              <div className="mt-3 space-y-1 text-xs text-gray-700">
                <div className="flex items-baseline justify-between">
                  <span>Spent so far</span>
                  <span className="text-base font-semibold text-gray-900">
                    ${projection.thisMonthSpend.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span>Projected end-of-month</span>
                  <span className="font-semibold text-amber-600">
                    ${projection.projectedEndOfMonth.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span>Planned monthly budget</span>
                  <span className="font-medium">
                    ${projection.monthlyBudget.toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Start adding transactions to see your projections.
            </p>
          )}
        </div>

        {/* Card 2: Safe daily spend */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
          <h2 className="text-sm font-semibold">
            Safe daily spending
          </h2>
          {projection ? (
            <>
              <p className="mt-1 text-xs text-gray-500">
                How much you can spend per day and still stay on track.
              </p>
              <div className="mt-3 space-y-1 text-xs text-gray-700">
                <div className="flex items-baseline justify-between">
                  <span>Remaining budget</span>
                  <span className="text-base font-semibold text-emerald-600">
                    ${projection.remainingBudget.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span>Safe spend per day</span>
                  <span className="font-semibold">
                    ${projection.safeSpendPerDay.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span>Current daily pace</span>
                  <span className="font-medium">
                    ${projection.dailyRateSoFar.toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              We’ll estimate your safe spend once you have some data
              this month.
            </p>
          )}
        </div>

        {/* Card 3: Scenario – cut top category */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
          <h2 className="text-sm font-semibold">
            Scenario: trim your top category
          </h2>
          {projection && projection.topCatName ? (
            <>
              <p className="mt-1 text-xs text-gray-500">
                If you reduced{" "}
                <span className="font-semibold">
                  {projection.topCatName}
                </span>{" "}
                spending by 20% this month:
              </p>
              <div className="mt-3 space-y-1 text-xs text-gray-700">
                <div className="flex items-baseline justify-between">
                  <span>Potential savings</span>
                  <span className="text-base font-semibold text-emerald-600">
                    ${projection.potentialSavings.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span>New projected total</span>
                  <span className="font-medium">
                    $
                    {Math.max(
                      projection.projectedEndOfMonth -
                        projection.potentialSavings,
                      0,
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                This is a simple estimate to help you see impact, not
                financial advice.
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Once you have more spending this month, we’ll show how
              much you could save by trimming your top category.
            </p>
          )}
        </div>
      </div>

      {/* SECTION E: Heatmap + Month comparison */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* E1: Spending heatmap */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                Spending heatmap (month × weekday)
              </h2>
              <p className="text-xs text-gray-500">
                Darker cells indicate higher total spending on that
                weekday in that month.
              </p>
            </div>
          </div>
          {heatmapRows.length === 0 || heatmapMax === 0 ? (
            <p className="text-sm text-gray-500">
              We’ll show this grid once you have spending for multiple
              months and days.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="grid auto-cols-fr grid-rows-[auto]">
                  {/* Header row */}
                  <div className="grid grid-cols-8 gap-1 text-[10px] text-gray-500 mb-1">
                    <div />
                    {weekdayLabels.map((label) => (
                      <div
                        key={label}
                        className="text-center"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  {/* Rows */}
                  <div className="space-y-1">
                    {heatmapRows.map((row) => (
                      <div
                        key={row.ymKey}
                        className="grid grid-cols-8 gap-1 items-center"
                      >
                        <div className="text-[11px] text-gray-600">
                          {row.monthLabel}
                        </div>
                        {row.values.map((v, idx) => {
                          const intensity =
                            heatmapMax > 0 ? v / heatmapMax : 0;
                          const opacity = 0.1 + intensity * 0.9;
                          return (
                            <div
                              key={`${row.ymKey}-${idx}`}
                              className="h-6 rounded-md border border-emerald-100"
                              style={{
                                backgroundColor:
                                  v > 0
                                    ? `rgba(34,197,94,${opacity.toFixed(
                                        2,
                                      )})`
                                    : "transparent",
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* E2: Month comparison (last 2 months) */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
          <h2 className="mb-1 text-sm font-semibold">
            Month comparison
          </h2>
          <p className="mb-2 text-xs text-gray-500">
            Compare total spend in the latest two months of this range.
          </p>
          {monthComparisonData.length < 2 ? (
            <p className="text-xs text-gray-500">
              We need at least two months of data in this range to
              compare.
            </p>
          ) : (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthComparisonData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" />
                  <YAxis tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value) => `$${Number(value).toFixed(2)}`}
                  />
                  <Legend />
                  <Bar
                    dataKey="amount"
                    name="Total spent"
                    radius={[4, 4, 0, 0]}
                    fill={ACCENT_MAIN}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}