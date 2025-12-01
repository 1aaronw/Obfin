export async function fetchNetIncome(annualIncome, state) {
  if (!annualIncome || !state) return null;

  try {
    const response = await fetch("http://localhost:5001/api/tax/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ income: Number(annualIncome), state }),
    });

    const data = await response.json();
    if (!response.ok) return null;

    return data.netIncome; // backend returns: federalTax, stateTax, totalTax, netIncome
  } catch (err) {
    console.error("Tax API Error:", err);
    return null;
  }
}
