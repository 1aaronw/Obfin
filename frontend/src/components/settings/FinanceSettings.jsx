// src/components/settings/FinanceSettings.jsx
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebase";

export default function FinanceSettings({ userData }) {
  const user = auth.currentUser;
  const budgets = userData?.budgets || {};

  // --- Load existing values ---
  const [annualIncome, setAnnualIncome] = useState(budgets.annualIncome || "");
  const [state, setState] = useState(budgets.state || "CA");

  const [monthlyIncome, setMonthlyIncome] = useState(
    budgets.monthlyIncome || ""
  );
  const [manualMonthlyOverride, setManualMonthlyOverride] = useState(false);

  // Savings goals
  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState(
    budgets.monthlySavingsGoal || ""
  );

  const annualSavingsGoal = Number(monthlySavingsGoal || 0) * 12;

  const [categories, setCategories] = useState({
    food: budgets.food || "",
    entertainment: budgets.entertainment || "",
    insurance: budgets.insurance || "",
    utilities: budgets.utilities || "",
    miscellaneous: budgets.miscellaneous || "",
  });

  const num = (v) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));

  // --- Auto-calc monthly income when annual income or state changes ---
  useEffect(() => {
    if (!annualIncome || manualMonthlyOverride) return;

    const fetchMonthlyIncome = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/tax/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            income: Number(annualIncome),
            state,
          }),
        });

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

  // --- Summary ---
  const total = Object.values(categories).reduce((sum, v) => sum + num(v), 0);
  const income = num(monthlyIncome);
  const percent = income > 0 ? (total / income) * 100 : 0;

  let summaryColor = "text-gray-700";
  if (income > 0) {
    if (percent <= 90) summaryColor = "text-green-600";
    else if (percent <= 110) summaryColor = "text-yellow-600";
    else summaryColor = "text-red-600";
  }

  const handleChange = (key, value) => {
    setCategories((prev) => ({
      ...prev,
      [key]: value === "" ? "" : Number(value),
    }));
  };

  const handleReset = () => {
    setCategories({
      food: "",
      entertainment: "",
      insurance: "",
      utilities: "",
      miscellaneous: "",
    });
  };

  // --- Save to Firestore ---
  const handleSave = async () => {
    if (!user) return alert("Not logged in.");

    try {
      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        budgets: {
          annualIncome: num(annualIncome),
          monthlyIncome: num(monthlyIncome),
          state,
          monthlySavingsGoal: num(monthlySavingsGoal),

          // categories
          ...Object.fromEntries(
            Object.entries(categories).map(([k, v]) => [k, num(v)])
          ),
        },
      });

      alert("Finance settings updated!");
    } catch (err) {
      console.error("Finance settings save error:", err);
      alert("Failed to save finance settings.");
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-xl font-semibold">Finance Settings</h2>

      {/* Income Section */}
      <div className="border rounded-lg p-4 shadow-sm bg-white space-y-4">
        
        {/* Annual Income */}
        <div>
          <label className="font-medium text-sm">Annual Income ($)</label>
          <input
            type="number"
            placeholder="e.g. 60000"
            className="border p-2 w-full rounded"
            value={annualIncome}
            onChange={(e) => {
              setAnnualIncome(e.target.value);
              setManualMonthlyOverride(false);
            }}
          />
        </div>

        {/* State Selection */}
        <div>
          <label className="font-medium text-sm">State</label>
          <select
            className="border p-2 w-full rounded"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setManualMonthlyOverride(false);
            }}
          >
            {[
              "CA","TX","FL","NY","NJ","PA","IL","OH","AZ","MI","GA","NC","VA","WA",
              "MA","TN","IN","MD","MO","WI","MN","CO","AL","SC","KY","LA","OR","OK",
              "CT","IA","MS","AR","KS","UT","NV","NM","NE","WV","ID","HI","NH","ME",
              "RI","MT","DE","SD","ND","VT","AK","WY","DC",
            ].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Monthly Income */}
        <div>
          <label className="font-medium text-sm">
            Monthly Net Income ($)
            {manualMonthlyOverride && (
              <span className="ml-2 text-xs text-blue-600">(manual override)</span>
            )}
          </label>
          <input
            type="number"
            className="border p-2 w-full rounded"
            value={monthlyIncome}
            onChange={(e) => {
              setMonthlyIncome(e.target.value);
              setManualMonthlyOverride(true);
            }}
          />
        </div>

        {/* Monthly Savings Goal */}
        <div>
          <label className="font-medium text-sm">Monthly Savings Goal ($)</label>
          <input
            type="number"
            placeholder="e.g. 500"
            className="border p-2 w-full rounded"
            value={monthlySavingsGoal}
            onChange={(e) => setMonthlySavingsGoal(e.target.value)}
          />
        </div>

        {/* Annual Savings Goal (Auto) */}
        <div>
          <label className="font-medium text-sm">Annual Savings Goal ($)</label>
          <input
            type="number"
            className="border p-2 w-full rounded bg-gray-100"
            value={annualSavingsGoal}
            readOnly
          />
        </div>
      </div>

      {/* Categories */}
      <div className="border rounded-lg p-4 shadow-sm bg-white space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Budget Categories</h3>
          <button
            className="text-gray-500 text-sm underline"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>

        {Object.keys(categories).map((key) => (
          <div key={key}>
            <label className="capitalize font-medium text-sm">{key}</label>
            <input
              type="number"
              className="border p-2 w-full rounded"
              value={categories[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={`Amount for ${key}`}
            />
          </div>
        ))}

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

          {income > 0 && percent > 110 && (
            <p className="text-xs text-red-500 mt-1">
              Your total budget exceeds your income — consider adjusting some
              categories.
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="bg-green-600 text-white px-4 py-2 rounded shadow"
      >
        Save Finance Settings
      </button>
    </div>
  );
}