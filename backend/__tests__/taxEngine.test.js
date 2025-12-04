import { computeTax } from '../tax/taxEngine.js';
import federal from '../tax/data/federal_2025.preview.json';
import states from '../tax/data/states_2025.preview.json';

describe('Tax Engine Calculations', () => {

  // basic fed tax
  test('Federal tax for $50,000 income (single)', () => {
    const result = computeTax({
      income: 50000,
      filingStatus: 'single',
      federal,
      stateCfg: { type: 'none' }
    });

    // $50000 - $14600 std deduction = $35400 taxable
    // 10% on first $11000 = $1100
    // 12% on next $24400 = $2928
    // total tax = $4028
    expect(result.federalTax).toBe(4028);
    expect(result.stateTax).toBe(0);
    expect(result.totalTax).toBe(4028);
  });

  test('Federal tax for $200,000 income (single)', () => {
    const result = computeTax({
      income: 200000,
      filingStatus: 'single',
      federal,
      stateCfg: { type: 'none' }
    });

    expect(result.federalTax).toBe(38160);
    expect(result.effectiveRate).toBeCloseTo(19.08);
  });

  // state
  test('CA progressive state tax for $75,000 income', () => {
    const result = computeTax({
      income: 75000,
      filingStatus: 'single',
      federal,
      stateCfg: states.CA
    });

    // CA tax calculation verification
    expect(result.stateTax).toBeGreaterThan(2000);
    expect(result.stateTax).toBeLessThan(5000);
  });

  test('CO flat tax for $100,000 income', () => {
    const result = computeTax({
      income: 100000,
      filingStatus: 'single',
      federal,
      stateCfg: states.CO
    });

    // 4.4% of $100000 = $4400
    expect(result.stateTax).toBe(4400);
  });

  // combined tax
  test('Combined tax for $85,000 income in AZ', () => {
    const result = computeTax({
      income: 85000,
      filingStatus: 'single',
      federal,
      stateCfg: states.AZ
    });

    // original implementation applies flat tax to full income
    expect(result.federalTax).toBe(10795.50);
    expect(result.stateTax).toBe(2380); // 2.8% of $85,000
    expect(result.totalTax).toBe(13175.50);
  });

  // edge case
  test('Zero income returns zero taxes', () => {
    const result = computeTax({
      income: 0,
      filingStatus: 'single',
      federal,
      stateCfg: states.CA
    });

    expect(result.federalTax).toBe(0);
    expect(result.stateTax).toBe(0);
    expect(result.totalTax).toBe(0);
  });

  test('High income ($1M) with flat state tax', () => {
    const result = computeTax({
      income: 1000000,
      filingStatus: 'single',
      federal,
      stateCfg: states.UT
    });

    expect(result.federalTax).toBeGreaterThan(300000);
    expect(result.stateTax).toBe(45500); // 4.55% of $1M
  });
});
