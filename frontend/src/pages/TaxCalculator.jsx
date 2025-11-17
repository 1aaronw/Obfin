import { useState } from "react";

export default function TaxCalculator() {
  const [income, setIncome] = useState("");
  const [state, setState] = useState("CA");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const calculateTax = async () => {
    setLoading(true);
    setErrorMsg("");
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

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center p-6">
      <div className="w-full max-w-lg bg-white shadow-lg p-8 rounded-xl border">
        <h1 className="text-3xl font-bold text-center mb-6 text-green-700">
          U.S. Tax Calculator
        </h1>

        {/* Income */}
        <label className="font-semibold">Annual Income ($)</label>
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          placeholder="Enter income"
          className="w-full mt-1 mb-4 p-2 border rounded"
        />

        {/* State */}
        <label className="font-semibold">State</label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full mt-1 mb-6 p-2 border rounded"
        >
          {[
            "CA","TX","FL","NY","NJ","PA","IL","OH","AZ","MI",
            "GA","NC","VA","WA","MA","TN","IN","MD","MO","WI",
            "MN","CO","AL","SC","KY","LA","OR","OK","CT","IA",
            "MS","AR","KS","UT","NV","NM","NE","WV","ID","HI",
            "NH","ME","RI","MT","DE","SD","ND","VT","AK","WY","DC"
          ].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button
          onClick={calculateTax}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold"
        >
          {loading ? "Calculating..." : "Calculate Tax"}
        </button>

        {errorMsg && (
          <p className="text-red-600 mt-4 text-center">{errorMsg}</p>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
            <h2 className="font-bold mb-2 text-green-800">Results</h2>

            <p><strong>Federal Tax:</strong> ${result.federalTax}</p>
            <p><strong>State Tax ({state}):</strong> ${result.stateTax}</p>
            <p><strong>Total Tax:</strong> ${result.totalTax}</p>
            <p><strong>Net Income:</strong> ${result.netIncome}</p>
            <p><strong>Effective Rate:</strong> {result.effectiveRate}%</p>
          </div>
        )}
      </div>
    </div>
  );
}