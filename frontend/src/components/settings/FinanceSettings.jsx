// src/components/settings/FinanceSettings.jsx
import { doc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState, memo } from "react";
import { auth, db } from "../../firebase/firebase";

export default function FinanceSettings({ userData }) {
  const user = auth.currentUser;
  const budgets = userData?.budgets || {};

  /* -----------------------------
      1. BASIC FIELDS
  ------------------------------*/
  const [annualIncome, setAnnualIncome] = useState(budgets.annualIncome || "");
  const [state, setState] = useState(budgets.state || "CA");

  const [monthlyIncome, setMonthlyIncome] = useState(
    budgets.monthlyIncome || "",
  );
  const [manualMonthlyOverride, setManualMonthlyOverride] = useState(false);

  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState(
    budgets.monthlySavingsGoal || "",
  );
  const annualSavingsGoal = Number(monthlySavingsGoal || 0) * 12;

  const num = (v) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));

  /* -----------------------------
      2. CATEGORY MIGRATION
  ------------------------------*/

  const migrateOldCategories = () => {
    const oldKeys = [
      "food",
      "entertainment",
      "insurance",
      "utilities",
      "miscellaneous",
    ];

    const isOld = oldKeys.some((k) => budgets[k] !== undefined);

    if (!isOld) return budgets.categories || [];

    return oldKeys
      .filter((k) => budgets[k] !== undefined)
      .map((k) => ({
        id: k,
        name: k.charAt(0).toUpperCase() + k.slice(1),
        amount: budgets[k] || 0,
      }));
  };

  const [categories, setCategories] = useState(migrateOldCategories);

  /* -----------------------------
      3. COLLAPSIBLE SECTIONS
  ------------------------------*/
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  /* -----------------------------
      4. AUTO-CALC MONTHLY INCOME
  ------------------------------*/
  useEffect(() => {
    if (!annualIncome || manualMonthlyOverride) return;

    const fetchMonthlyIncome = async () => {
      try {
        const response = await fetch(
          "http://localhost:5001/api/tax/calculate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              income: Number(annualIncome),
              state,
            }),
          },
        );

        const data = await response.json();
        if (response.ok) {
          const autoMonthly = Math.round(data.netIncome / 12);
          setMonthlyIncome(autoMonthly);
        }
      } catch (err) {
        console.error("Auto income fetch failed:", err);
      }
    };

    fetchMonthlyIncome();
  }, [annualIncome, state, manualMonthlyOverride]);

  /* -----------------------------
      5. CATEGORY CRUD FUNCTIONS
  ------------------------------*/
  const addCategory = () => {
    const name = prompt("Enter category name:");
    if (!name) return;

    const id = `cat-${Date.now()}`; // stable & unique

    setCategories((prev) => [...prev, { id, name, amount: 0 }]);
  };

  const renameCategory = (id) => {
    const name = prompt("New name:");
    if (!name) return;

    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name } : cat)),
    );
  };

  const deleteCategory = (id) => {
    if (categories.length === 1)
      return alert("You must keep at least one category.");

    const confirmDelete = window.confirm("Delete this category?");
    if (!confirmDelete) return;

    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  const updateCategoryAmount = (id, value) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === id ? { ...cat, amount: value || "" } : cat,
      ),
    );
  };

  /* -----------------------------
      6. SUMMARY
  ------------------------------*/
  const total = categories.reduce((sum, c) => sum + num(c.amount), 0);
  const income = num(monthlyIncome);
  const percent = income > 0 ? (total / income) * 100 : 0;

  let summaryColor = "text-gray-700";
  if (income > 0) {
    if (percent <= 90) summaryColor = "text-green-600";
    else if (percent <= 110) summaryColor = "text-yellow-600";
    else summaryColor = "text-red-600";
  }

  /* -----------------------------
      7. SAVE TO FIRESTORE
  ------------------------------*/
  const handleSave = async () => {
    if (!user) return alert("Not logged in.");

    const userRef = doc(db, "users", user.uid);

    try {
      await updateDoc(userRef, {
        budgets: {
          annualIncome: num(annualIncome),
          monthlyIncome: num(monthlyIncome),
          state,
          monthlySavingsGoal: num(monthlySavingsGoal),
          categories,
        },
      });

      alert("Finance settings updated!");
    } catch (err) {
      console.error("Finance settings save error:", err);
      alert("Failed to save finance settings.");
    }
  };

  /* -----------------------------------------
      8. COMPONENT: Individual Category Card
  -------------------------------------------*/
  //prevents all the categories from being rendered
  const CategoryCard = memo(function CategoryCard({
    cat,
    updateCategoryAmount,
    renameCategory,
    deleteCategory,
    categoriesLength,
  }) {
    const [collapsed, setCollapsed] = useState(false);

    return (
      <div className="rounded-lg border bg-gray-50 p-4 shadow-sm">
        {/* Header Row */}
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => setCollapsed(!collapsed)}
        >
          <h4 className="font-medium">{cat.name}</h4>

          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              {collapsed ? "Show ▼" : "Hide ▲"}
            </span>
            <div className="flex gap-3 text-sm">
              <button
                className="text-blue-600 underline"
                onClick={(e) => {
                  e.stopPropagation();
                  renameCategory(cat.id);
                }}
              >
                Rename
              </button>
              <button
                disabled={categoriesLength === 1}
                className={`underline ${categoriesLength === 1 ? "cursor-not-allowed text-gray-400" : "text-red-600 hover:text-red-700"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCategory(cat.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Content */}
        {!collapsed && (
          <div className="mt-3">
            <label className="text-sm">Budget Amount ($)</label>
            <input
              type="number"
              className="w-full rounded border p-2"
              value={cat.amount}
              onChange={(e) => updateCategoryAmount(cat.id, e.target.value)}
            />
          </div>
        )}
      </div>
    );
  });

  /* -----------------------------
      9. UI BELOW (FULL)
  ------------------------------*/
  return (
    <div className="max-w-xl space-y-6">
      <h2 className="text-xl font-semibold">Finance Settings</h2>

      {/* Income Box */}
      <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
        <div>
          <label className="text-sm font-medium">Annual Income ($)</label>
          <input
            type="number"
            className="w-full rounded border p-2"
            value={annualIncome}
            onChange={(e) => {
              setAnnualIncome(e.target.value);
              setManualMonthlyOverride(false);
            }}
          />
        </div>

        <div>
          <label className="text-sm font-medium">State</label>
          <select
            className="w-full rounded border p-2"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setManualMonthlyOverride(false);
            }}
          >
            {[
              "CA",
              "TX",
              "FL",
              "NY",
              "NJ",
              "PA",
              "IL",
              "OH",
              "AZ",
              "MI",
              "GA",
              "NC",
              "VA",
              "WA",
              "MA",
              "TN",
              "IN",
              "MD",
              "MO",
              "WI",
              "MN",
              "CO",
              "AL",
              "SC",
              "KY",
              "LA",
              "OR",
              "OK",
              "CT",
              "IA",
              "MS",
              "AR",
              "KS",
              "UT",
              "NV",
              "NM",
              "NE",
              "WV",
              "ID",
              "HI",
              "NH",
              "ME",
              "RI",
              "MT",
              "DE",
              "SD",
              "ND",
              "VT",
              "AK",
              "WY",
              "DC",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">
            Monthly Net Income ($)
            {manualMonthlyOverride && (
              <span className="ml-2 text-xs text-blue-600">(manual)</span>
            )}
          </label>
          <input
            type="number"
            className="w-full rounded border p-2"
            value={monthlyIncome}
            onChange={(e) => {
              setMonthlyIncome(e.target.value);
              setManualMonthlyOverride(true);
            }}
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Monthly Savings Goal ($)
          </label>
          <input
            type="number"
            className="w-full rounded border p-2"
            value={monthlySavingsGoal}
            onChange={(e) => setMonthlySavingsGoal(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Annual Savings Goal ($)</label>
          <input
            type="number"
            className="w-full rounded border bg-gray-100 p-2"
            value={annualSavingsGoal}
            readOnly
          />
        </div>
      </div>

      {/* Categories Box */}
      <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
        {/* Collapse All Header */}
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => setCategoriesOpen(!categoriesOpen)}
        >
          <h3 className="font-semibold">Budget Categories</h3>
          <span className="text-sm text-gray-500">
            {categoriesOpen ? "Hide ▲" : "Show ▼"}
          </span>
        </div>

        {categoriesOpen && (
          <>
            <button
              onClick={addCategory}
              className="rounded bg-blue-600 px-3 py-1 text-white transition hover:bg-blue-700"
            >
              + Add Category
            </button>

            <div className="space-y-4">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  updateCategoryAmount={updateCategoryAmount}
                  renameCategory={renameCategory}
                  deleteCategory={deleteCategory}
                  categoriesLength={categories.length}
                />
              ))}
            </div>

            {/* Summary */}
            <div className="pt-2">
              <p className={`font-medium ${summaryColor}`}>
                Total Budget: <strong>${total.toFixed(2)}</strong>
                {income > 0 && (
                  <>
                    {" "}
                    — {percent.toFixed(1)}% of your income (${income})
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleSave}
        className="rounded bg-green-600 px-4 py-2 text-white shadow"
      >
        Save Finance Settings
      </button>
    </div>
  );
}
