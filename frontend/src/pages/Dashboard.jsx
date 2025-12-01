// src/pages/Dashboard.jsx
import {
  collection,
  doc,
  getDoc,
  increment,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { auth, db } from "../firebase/firebase";
import AddTransactionModal from "./transactions/AddTransactionModal";

// Simple color palette for charts
const CATEGORY_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#e11d48",
  "#a855f7",
  "#facc15",
  "#64748b",
];

function formatMonthLabel(key) {
  // key like "2025-01"
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

// Generate last 12 months keys like "2025-11"
function getLast12Months() {
  const result = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
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

  return result;
}

function getPreviousMonthKey(key) {
  const [yearStr, monthStr] = key.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  month -= 1;
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function normalizeId(id) {
  return String(id || "").toLowerCase().trim();
}

// Fallback/sample news in case API fails
const SAMPLE_NEWS = [
  {
    id: "s1",
    source: "Global Markets Brief",
    headline: "Investors rotate back into tech as markets eye lower rates",
    timeAgo: "Today",
    topic: "Stocks • Tech",
  },
  {
    id: "s2",
    source: "Money Daily",
    headline: "How to build an emergency fund without pausing your goals",
    timeAgo: "2h ago",
    topic: "Personal Finance",
  },
  {
    id: "s3",
    source: "Commodities Watch",
    headline: "Oil retreats as recession fears outweigh supply concerns",
    timeAgo: "3h ago",
    topic: "Energy",
  },
  {
    id: "s4",
    source: "Bond Desk",
    headline: "Treasury yields fall after cooler inflation data",
    timeAgo: "4h ago",
    topic: "Bonds",
  },
  {
    id: "s5",
    source: "FX Radar",
    headline: "Dollar slips as markets price in rate cuts",
    timeAgo: "5h ago",
    topic: "Currencies",
  },
];

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionDraft, setTransactionDraft] = useState({
    date: "",
    category: "",
    amount: "",
    description: "",
  });
  const [refreshKey, setRefreshKey] = useState(0); // force reload after adding tx
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);

  // News state
  const [newsItems, setNewsItems] = useState([]);
  const [newsStatus, setNewsStatus] = useState("loading");

  const last12Months = useMemo(() => getLast12Months(), []);
  const currentMonthKey = last12Months[0].key;
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);

  // 1) Load user data (budgets + spending + monthlyTrends)
  useEffect(() => {
    const load = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setErrorMsg("You must be logged in to view your dashboard.");
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
        console.error("Failed to load dashboard data:", err);
        setErrorMsg("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [refreshKey]);

  // 2) Load news (with graceful fallback)
  useEffect(() => {
    const loadNews = async () => {
      try {
        // CRA-style env var name
        const apiKey = process.env.REACT_APP_MARKETAUX_API_KEY;

        if (!apiKey) {
          setNewsStatus("sample");
          setNewsItems(SAMPLE_NEWS);
          return;
        }

        const url = `https://api.marketaux.com/v1/news/all?language=en&filter_entities=true&group_by=source&limit=10&api_token=${encodeURIComponent(
          apiKey,
        )}`;

        const res = await fetch(url);
        const contentType = res.headers.get("content-type") || "";

        if (!res.ok || !contentType.includes("application/json")) {
          console.warn("News API returned non-JSON or error, using sample.");
          setNewsStatus("sample");
          setNewsItems(SAMPLE_NEWS);
          return;
        }

        const data = await res.json();
        const articles = Array.isArray(data.data) ? data.data : [];

        if (!articles.length) {
          setNewsStatus("sample");
          setNewsItems(SAMPLE_NEWS);
          return;
        }

        const mapped = articles.slice(0, 10).map((item, idx) => ({
          id: item.uuid || `api-${idx}`,
          source: item.source || "News",
          headline: item.title || "Untitled headline",
          timeAgo: item.published_at
            ? new Date(item.published_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          topic: (item.category && String(item.category)) || "",
        }));

        setNewsItems(mapped);
        setNewsStatus("live");
      } catch (err) {
        console.warn("Failed to load news, using sample.", err);
        setNewsStatus("sample");
        setNewsItems(SAMPLE_NEWS);
      }
    };

    loadNews();
  }, []);

  // 3) Extract budgets + spending from userData
  const rawBudgets = userData?.budgets || {};
  const categories = (rawBudgets.categories || []).map((c) => ({
    ...c,
    id: normalizeId(c.id),
  }));
  const monthlyIncome = Number(rawBudgets.monthlyIncome || 0);
  const monthlySavingsGoal = Number(rawBudgets.monthlySavingsGoal || 0);
  const spending = userData?.spending || {};
  const monthlyTrends = userData?.monthlyTrends || {};

  // 4) Compute SELECTED month's transactions and summary
  const allSpendingEntries = Object.values(spending).map((tx) => ({
    ...tx,
    amount: Number(tx.amount || 0),
    normCategory: normalizeId(tx.category),
  }));

  const thisMonthTransactions = allSpendingEntries.filter((tx) =>
    typeof tx.date === "string"
      ? tx.date.startsWith(selectedMonthKey)
      : false,
  );

  const thisMonthTotal = thisMonthTransactions.reduce(
    (sum, tx) => sum + (tx.amount || 0),
    0,
  );

  // Per-category spent this month (by normalized category id)
  const spendByCategory = {};
  thisMonthTransactions.forEach((tx) => {
    const catId = tx.normCategory || "uncategorized";
    spendByCategory[catId] =
      (spendByCategory[catId] || 0) + (tx.amount || 0);
  });

  // Helper: find category display name by id
  const getCategoryName = (id) => {
    const normId = normalizeId(id);
    const found = categories.find((c) => c.id === normId);
    return found?.name || id || "Uncategorized";
  };

  // 5) Category chart data: budget vs spent (deduped by id)
  const categoryMap = {};

  // Start with categories defined in Finance Settings
  categories.forEach((cat) => {
    const catId = cat.id;
    const spent = spendByCategory[catId] || 0;
    const budget = Number(cat.amount || 0);

    const usedPct =
      budget > 0
        ? Math.round((spent / budget) * 100)
        : spent > 0
        ? 150 // treat as way over budget visually
        : 0;

    categoryMap[catId] = {
      id: catId,
      name: cat.name,
      spent,
      budget,
      usedPct,
    };
  });

  // Add any categories that appear in spend but aren't in budgets
  Object.keys(spendByCategory).forEach((catIdRaw) => {
    const catId = normalizeId(catIdRaw);
    if (!categoryMap[catId]) {
      const spent = spendByCategory[catId] || 0;
      const budget = 0;
      const usedPct = spent > 0 ? 150 : 0;

      categoryMap[catId] = {
        id: catId,
        name: getCategoryName(catId),
        spent,
        budget,
        usedPct,
      };
    }
  });

  const categoryChartData = Object.values(categoryMap).filter(
    (item) => item.budget > 0 || item.spent > 0,
  );

  // 6) Monthly trend chart data (from monthlyTrends map, last 6 months)
  const monthlyTrendData = Object.entries(monthlyTrends)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .slice(-6)
    .map(([key, value]) => ({
      key,
      month: formatMonthLabel(key),
      amount: Number(value || 0),
    }));

  // 7) Savings progress for selected month
  const savingsProgress =
    monthlySavingsGoal > 0
      ? Math.min(
          100,
          Math.round(
            (Math.max(monthlyIncome - thisMonthTotal, 0) /
              monthlySavingsGoal) *
              100,
          ),
        )
      : 0;

// 8) Monthly budget gauge (new odometer-style semi-circle)
const totalCategoryBudget = categories.reduce(
  (sum, cat) => sum + Number(cat.amount || 0),
  0
);

// fallback budget = income - savingsGoal
const fallbackBudget = Math.max(monthlyIncome - monthlySavingsGoal, 0);

// total usable monthly budget:
const monthlyBudget =
  totalCategoryBudget || fallbackBudget || thisMonthTotal || 1;

// raw % used
const rawBudgetPct = (thisMonthTotal / monthlyBudget) * 100;
const budgetUsedPctLabel = Math.round(rawBudgetPct || 0);

// For the gauge arc (0 → 180 degrees mapped to 0 → 100%)
const gaugePercentClamped = Math.min(
  100,
  Math.max(0, rawBudgetPct || 0)
);

// dynamic color thresholds
let gaugeColor = "#22c55e"; // green
if (gaugePercentClamped > 90) gaugeColor = "#ef4444"; // red
else if (gaugePercentClamped > 60) gaugeColor = "#f97316"; // orange

// Recharts needs a value out of 100
const budgetGaugeData = [
  {
    name: "Spent",
    value: gaugePercentClamped,
    fill: gaugeColor,
  },
];

  // 9) Month-over-month change (for insight card + trend subtitle)
  const prevMonthKey = getPreviousMonthKey(selectedMonthKey);
  const prevMonthAmount = Number(monthlyTrends?.[prevMonthKey] || 0);
  let monthChangePct = null;
  if (prevMonthAmount > 0) {
    monthChangePct = Math.round(
      ((thisMonthTotal - prevMonthAmount) / prevMonthAmount) * 100,
    );
  }
  const monthChangeDirection =
    monthChangePct === null
      ? "none"
      : monthChangePct > 0
      ? "up"
      : monthChangePct < 0
      ? "down"
      : "same";

  // 10) Top categories mini bar data (top 3 by spend)
  const topCategoriesData = [...categoryChartData]
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 3);

  // 11) Recent transactions mini list (latest 5 overall)
  const recentTransactions = [...allSpendingEntries]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 5);

  const categoryIds = categories.map((c) => c.id);
  const selectedMonthLabel =
    last12Months.find((m) => m.key === selectedMonthKey)?.label ||
    formatMonthLabel(selectedMonthKey);

  // Small helpers
  const remainingBudget = Math.max(monthlyBudget - thisMonthTotal, 0);
  const incomeUsagePct =
    monthlyIncome > 0
      ? Math.round((thisMonthTotal / monthlyIncome) * 100)
      : 0;

  const trendSubtitle =
    monthChangePct === null
      ? "Total spent each month based on all recorded transactions."
      : monthChangeDirection === "up"
      ? `Spending is ${Math.abs(
          monthChangePct,
        )}% higher than the previous month.`
      : monthChangeDirection === "down"
      ? `Spending is ${Math.abs(
          monthChangePct,
        )}% lower than the previous month.`
      : "Spending is about the same as the previous month.";

  // ---------------- Add Transaction logic ----------------
  async function handleAddTransaction() {
    if (!transactionDraft.amount || Number(transactionDraft.amount) <= 0) {
      alert("Amount must be a positive number.");
      return;
    }
    if (!transactionDraft.description.trim()) {
      alert("Description cannot be empty.");
      return;
    }
    if (!transactionDraft.date) {
      alert("Date cannot be empty.");
      return;
    }
    if (!transactionDraft.category) {
      alert("Category cannot be empty.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in.");
        return;
      }

      const month = transactionDraft.date.substring(5, 7);
      const year = transactionDraft.date.substring(0, 4);
      const transId = doc(
        collection(db, "users", user.uid, "spending"),
      ).id;

      const yearMonthKey = `${year}-${month}`;
      const normalizedCategory = normalizeId(transactionDraft.category);

      await updateDoc(doc(db, "users", user.uid), {
        [`spending.${transId}`]: {
          amount: Number(transactionDraft.amount),
          category: normalizedCategory,
          date: transactionDraft.date,
          description: transactionDraft.description,
          createdAt: Date.now(),
        },
        [`monthlyTrends.${yearMonthKey}`]: increment(
          Number(transactionDraft.amount),
        ),
      });

      setIsModalOpen(false);
      setTransactionDraft({
        date: "",
        category: "",
        amount: "",
        description: "",
      });
      setRefreshKey((prev) => prev + 1); // reload dashboard data
    } catch (err) {
      console.error("Failed to add transaction from dashboard:", err);
      alert("Failed to add transaction.");
    }
  }

  // ---------------- UI ----------------
  if (loading) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>
        <p>Loading your data…</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>
        <p className="text-red-600">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header + Month Selector + Add Transaction */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Dashboard</h1>

            {/* Apple-style month popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMonthMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <span>{selectedMonthLabel}</span>
                <span className="text-gray-400">▾</span>
              </button>

              {isMonthMenuOpen && (
                <div
                  className="absolute left-0 z-20 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 text-sm shadow-xl"
                  onMouseLeave={() => setIsMonthMenuOpen(false)}
                >
                  <div className="px-2 pb-2 text-xs font-semibold uppercase text-gray-400">
                    Select month
                  </div>
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {last12Months.map((m) => {
                      const mtKey = m.key;
                      const mtAmount = Number(
                        monthlyTrends?.[mtKey] || 0,
                      );
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            setSelectedMonthKey(m.key);
                            setIsMonthMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-xs transition ${
                            m.key === selectedMonthKey
                              ? "bg-black text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span>{m.label}</span>
                            {mtAmount > 0 && (
                              <span className="text-[10px] text-gray-400">
                                Spent ${mtAmount.toFixed(0)}
                              </span>
                            )}
                          </div>
                          {m.key === currentMonthKey && (
                            <span className="text-[10px] uppercase tracking-wide text-gray-400">
                              current
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Snapshot of your budgets and spending for{" "}
            <span className="font-medium">{selectedMonthLabel}</span>.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="ml-auto rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
        >
          + Add Transaction
        </button>
      </div>

      {/* Insight card: This month at a glance */}
      <div className="rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-md transition hover:shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-300">
              This month at a glance
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold">
                ${thisMonthTotal.toFixed(2)}
              </span>
              <span className="text-xs text-slate-300">
                spent in {selectedMonthLabel}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-200">
              <span>
                Remaining budget:{" "}
                <span className="font-semibold">
                  ${remainingBudget.toFixed(2)}
                </span>
              </span>
              {monthlyIncome > 0 && (
                <span>{incomeUsagePct}% of monthly income used</span>
              )}
              {topCategoriesData[0] && (
                <span>
                  Top category:{" "}
                  <span className="font-semibold">
                    {topCategoriesData[0].name}
                  </span>{" "}
                  (${topCategoriesData[0].spent.toFixed(2)})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs md:text-sm">
            {monthChangePct !== null ? (
              <div className="flex items-center gap-1 rounded-full bg-slate-800/70 px-3 py-1">
                <span
                  className={
                    monthChangeDirection === "up"
                      ? "text-red-400"
                      : monthChangeDirection === "down"
                      ? "text-emerald-400"
                      : "text-slate-200"
                  }
                >
                  {monthChangeDirection === "up"
                    ? "▲"
                    : monthChangeDirection === "down"
                    ? "▼"
                    : "●"}
                </span>
                <span>
                  {Math.abs(monthChangePct)}%
                  {monthChangeDirection === "up"
                    ? " higher than last month"
                    : monthChangeDirection === "down"
                    ? " lower than last month"
                    : " same as last month"}
                </span>
              </div>
            ) : (
              <span className="rounded-full bg-slate-800/70 px-3 py-1">
                Not enough history to compare yet
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Top summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
          <p className="text-xs uppercase text-gray-500">
            Spend in {selectedMonthLabel}
          </p>
          <p className="mt-2 text-2xl font-semibold">
            ${thisMonthTotal.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Across {thisMonthTransactions.length} transaction
            {thisMonthTransactions.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
          <p className="text-xs uppercase text-gray-500">
            Monthly Net Income
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {monthlyIncome > 0 ? `$${monthlyIncome.toFixed(2)}` : "—"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            From your finance settings
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
          <p className="text-xs uppercase text-gray-500">
            Savings Goal (Monthly)
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {monthlySavingsGoal > 0
              ? `$${monthlySavingsGoal.toFixed(2)}`
              : "—"}
          </p>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{savingsProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div
                className={`h-2 rounded-full ${
                  savingsProgress <= 50
                    ? "bg-green-500"
                    : savingsProgress <= 80
                    ? "bg-orange-400"
                    : "bg-red-500"
                }`}
                style={{ width: `${savingsProgress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Approx saving this month:{" "}
              {monthlyIncome > 0
                ? `$${Math.max(
                    monthlyIncome - thisMonthTotal,
                    0,
                  ).toFixed(2)}`
                : "$0"}
              .
            </p>
          </div>
        </div>
      </div>

      {/* Middle layout: left (donut + top cats) / right (meters + gauge + news) */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Left: donut + top categories (take 2 columns on xl) */}
        <div className="space-y-4 xl:col-span-2">
          {/* Category donut */}
          <div className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Spending by Category
              </h2>
              <span className="text-xs text-gray-400">
                {selectedMonthLabel}
              </span>
            </div>
            {categoryChartData.length === 0 ? (
              <p className="text-sm text-gray-500">
                No spending recorded in {selectedMonthLabel}. Add a
                transaction to see this fill in.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="spent"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      isAnimationActive
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.id}-${index}`}
                          fill={
                            CATEGORY_COLORS[
                              index % CATEGORY_COLORS.length
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    {/* Center label */}
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-gray-800 text-sm"
                    >
                      ${thisMonthTotal.toFixed(0)}
                    </text>
                    <text
                      x="50%"
                      y="58%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-gray-400 text-[10px]"
                    >
                      Total spent
                    </text>
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "spent") {
                          return [
                            `$${Number(value).toFixed(2)}`,
                            "Spent",
                          ];
                        }
                        return value;
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top categories mini bar */}
          <div className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Top categories</h2>
              <span className="text-xs text-gray-400">
                By spend in {selectedMonthLabel}
              </span>
            </div>
            {topCategoriesData.length === 0 ? (
              <p className="text-sm text-gray-500">
                No category spending yet this month.
              </p>
            ) : (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCategoriesData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      tickFormatter={(value) => `$${value}`}
                      domain={[0, "dataMax + 20"]}
                    />
                    <Tooltip
                      formatter={(value) => `$${Number(value).toFixed(2)}`}
                    />
                    <Bar dataKey="spent" radius={[4, 4, 0, 0]}>
                      {topCategoriesData.map((entry, index) => (
                        <Cell
                          key={entry.id}
                          fill={
                            CATEGORY_COLORS[
                              index % CATEGORY_COLORS.length
                            ]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Right column: meters + gauge + news */}
        <div className="space-y-4">
          {/* Category budget meters */}
          <div className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
            <h2 className="mb-2 text-sm font-semibold">
              Category Budget Meters
            </h2>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {categoryChartData.length === 0 && (
                <p className="text-sm text-gray-500">
                  Set up categories and budgets in Finance Settings to
                  see progress here.
                </p>
              )}

              {categoryChartData.map((cat) => {
                const pct = cat.usedPct || 0;
                const riskColorClass =
                  pct <= 50
                    ? "bg-green-500"
                    : pct <= 80
                    ? "bg-orange-400"
                    : "bg-red-500";

                const bgTintClass =
                  pct <= 50
                    ? "bg-green-50"
                    : pct <= 80
                    ? "bg-orange-50"
                    : "bg-red-50";

                return (
                  <div
                    key={cat.id}
                    className={`space-y-1 rounded-lg px-2 py-1 ${bgTintClass}`}
                  >
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-gray-600">
                        ${cat.spent.toFixed(2)} / ${cat.budget.toFixed(2)} (
                        {pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${riskColorClass}`}
                        style={{ width: `${Math.min(pct, 150)}%` }}
                      />
                    </div>
                    {pct > 80 && (
                      <div className="text-[10px] text-red-600">
                        Close to your limit for this category.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

{/* Monthly remaining budget gauge (odometer style) */}
<div className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
  <h2 className="mb-1 text-sm font-semibold">Monthly budget gauge</h2>
  <p className="mb-2 text-xs text-gray-500">
    Overall spending vs your total monthly budget.
  </p>

  <div className="flex items-center justify-center">
    <div className="h-36 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="100%"      // pushes arc down so top half only
          innerRadius="70%"
          outerRadius="100%"
          barSize={16}
          startAngle={180}
          endAngle={0}
          data={budgetGaugeData}
        >
          {/* BACKGROUND ARC (empty portion) */}
          <RadialBar
            dataKey="value"
            clockWise
            background={{ fill: "#e5e7eb" }}
            cornerRadius={8}
          />

          {/* FOREGROUND ARC (colored progress) */}
          <RadialBar
            dataKey="value"
            clockWise
            cornerRadius={8}
            fill={gaugeColor}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>

    {/* Right side labels */}
    <div className="ml-4 flex flex-col text-xs text-gray-700">
      <span className="text-[10px] uppercase text-gray-400">
        Budget used
      </span>
      <span className="text-xl font-semibold">
        {budgetUsedPctLabel}%
      </span>
      <span className="mt-1 text-gray-500">
        ${thisMonthTotal.toFixed(2)} / ${monthlyBudget.toFixed(2)}
      </span>
    </div>
  </div>
</div>

          {/* Market & Money News */}
          <div className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  Market &amp; Money News
                </h2>
                <p className="text-[11px] text-gray-500">
                  Headlines to keep you in the loop.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                    newsStatus === "live"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-50 text-gray-500"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      newsStatus === "live"
                        ? "bg-emerald-500"
                        : "bg-gray-400"
                    }`}
                  />
                  {newsStatus === "live" ? "LIVE" : "Sample"}
                </span>
              </div>
            </div>

            {newsItems.length === 0 ? (
              <p className="text-xs text-gray-500">
                Loading headlines…
              </p>
            ) : (
              <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {newsItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col rounded-lg px-2 py-1.5 text-xs hover:bg-gray-50"
                  >
                    <div className="mb-0.5 flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium">
                        {item.source}
                      </span>
                      {item.timeAgo && (
                        <span className="text-gray-400">
                          {item.timeAgo}
                        </span>
                      )}
                    </div>
                    <div className="line-clamp-1 font-medium text-gray-800">
                      {item.headline}
                    </div>
                    {item.topic && (
                      <div className="text-[10px] text-gray-500">
                        {item.topic}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Spending trend + Recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Spending trend */}
        <div className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md lg:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Spending Trend</h2>
              <p className="text-xs text-gray-500">{trendSubtitle}</p>
            </div>
            <span className="text-xs text-gray-400">Last 6 months</span>
          </div>
          {monthlyTrendData.length === 0 ? (
            <p className="text-sm text-gray-500">
              We’ll show a trend once you have spending across multiple
              months.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyTrendData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(value) => `$${value}`}
                    domain={[0, "dataMax + 20"]}
                  />
                  <Tooltip
                    formatter={(value) => `$${Number(value).toFixed(2)}`}
                  />
                  <Legend />
                  <Bar
                    dataKey="amount"
                    name="Total Spent"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
          <h2 className="mb-2 text-sm font-semibold">Recent activity</h2>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-gray-500">
              No transactions recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx, index) => {
                const catId = normalizeId(tx.category || "uncategorized");
                const colorIndex =
                  categoryIds.indexOf(catId) >= 0
                    ? categoryIds.indexOf(catId)
                    : index;
                const dotColor =
                  CATEGORY_COLORS[
                    colorIndex % CATEGORY_COLORS.length
                  ];
                const dateLabel = tx.date || "-";
                const nameLabel = getCategoryName(catId);

                return (
                  <div
                    key={`${tx.date}-${tx.description}-${index}`}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-2 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {tx.description || "(No description)"}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {nameLabel} • {dateLabel}
                        </span>
                      </div>
                    </div>
                    <span className="font-semibold">
                      ${tx.amount.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddTransaction}
        onChange={setTransactionDraft}
        // Pass IDs as categories because that's what we store in spending.category
        categories={categoryIds}
      />
    </div>
  );
}