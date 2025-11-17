// lib/taxEngine.js

const marginalTax = (taxableIncome, brackets) => {
  let remaining = taxableIncome;
  let lastCap = 0;
  let tax = 0;

  for (const b of brackets) {
    const cap = b.upTo ?? Infinity;
    const span = Math.max(0, Math.min(remaining, cap - lastCap));

    if (span > 0) {
      tax += span * b.rate;
      remaining -= span;
      lastCap = cap;
    }

    if (remaining <= 0) break;
  }

  return tax;
};

export const computeTax = ({ income, filingStatus, federal, stateCfg }) => {
  const fs = filingStatus; // single | married_joint | head

  // Federal
  const fedSD = federal.standardDeduction[fs] ?? 0;
  const fedTaxable = Math.max(0, income - fedSD);
  const fedTax = marginalTax(fedTaxable, federal.brackets[fs]);

  // State
  let stateTax = 0;

  if (stateCfg.type === "progressive") {
    const stSD = stateCfg.standardDeduction?.[fs] ?? 0;
    const stTaxable = Math.max(0, income - stSD);
    stateTax = marginalTax(stTaxable, stateCfg.brackets[fs] ?? []);
  }

  if (stateCfg.type === "flat") {
    stateTax = income * (stateCfg.rate ?? 0);
  }

  return {
    federalTax: +fedTax.toFixed(2),
    stateTax: +stateTax.toFixed(2),
    totalTax: +(fedTax + stateTax).toFixed(2),
    netIncome: +(income - (fedTax + stateTax)).toFixed(2),
    effectiveRate: +(((fedTax + stateTax) / income) * 100).toFixed(2),
  };
};
