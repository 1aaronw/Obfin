import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { auth, db } from "../firebase/firebase";

export default function TaxCalculator() {
  const [income, setIncome] = useState("");
  const [state, setState] = useState("CA");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const calculateTax = async () => {
    setLoading(true);
    setErrorMsg("");
    setSaveMsg("");
    setResult(null);

    try {
      const response = await fetch("http://localhost:5001/api/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ income: Number(income), state }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || "Something went wrong");
      } else {
        setResult(data);
      }
    } catch (err) {
      setErrorMsg("Backend connection failed.");
    } finally {
      setLoading(false);
    }
  };
  const saveToFirestore = async () => {
    if (!auth.currentUser) {
      setSaveMsg("Please login first to save tax history.");
      return;
    }
    if (!result) return;

    setSaving(true);
    setSaveMsg("");

    try {
      const ref = collection(
        db,
        "users",
        auth.currentUser.uid,
        "taxCalculations",
      );

      await addDoc(ref, {
        income: Number(income),
        state,
        federalTax: result.federalTax,
        stateTax: result.stateTax,
        totalTax: result.totalTax,
        netIncome: result.netIncome,
        effectiveRate: result.effectiveRate,
        createdAt: serverTimestamp(),
      });

      setSaveMsg("Tax calculation saved to your profile!");
    } catch (err) {
      console.error(err);
      setSaveMsg("Failed to save tax data.");
    }

    setSaving(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg rounded-xl border bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-3xl font-bold text-green-700">
          U.S. Tax Calculator
        </h1>

        {/* Income */}
        <label className="font-semibold">Annual Income ($)</label>
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          placeholder="Enter income"
          className="mb-4 mt-1 w-full rounded border p-2"
        />

        {/* State */}
        <label className="font-semibold">State</label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="mb-6 mt-1 w-full rounded border p-2"
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

        <button
          onClick={calculateTax}
          disabled={loading}
          className="w-full rounded bg-green-600 py-2 font-semibold text-white hover:bg-green-700"
        >
          {loading ? "Calculating..." : "Calculate Tax"}
        </button>

        {errorMsg && (
          <p className="mt-4 text-center text-red-600">{errorMsg}</p>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 rounded border border-green-200 bg-green-50 p-4">
            <h2 className="mb-2 font-bold text-green-800">Results</h2>

            <p>
              <strong>Federal Tax:</strong> ${result.federalTax}
            </p>
            <p>
              <strong>State Tax ({state}):</strong> ${result.stateTax}
            </p>
            <p>
              <strong>Total Tax:</strong> ${result.totalTax}
            </p>
            <p>
              <strong>Net Income:</strong> ${result.netIncome}
            </p>
            <p>
              <strong>Effective Rate:</strong> {result.effectiveRate}%
            </p>
            <button
              onClick={saveToFirestore}
              disabled={saving}
              className="mt-4 w-full rounded bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700"
            >
              {saving ? "Saving..." : "Save to Profile"}
            </button>

            {saveMsg && (
              <p className="mt-2 text-center text-sm text-gray-700">
                {saveMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
