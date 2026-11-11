// Unit tests for the payment math. Run with: npm test
// describe() groups related tests; it() is one test; expect() checks a result.
// Testing money math is worth it: a wrong payment on a dealer site is a real problem.
import { describe, expect, it } from 'vitest';
import { calculatePayment, monthlyPayment } from './payment';

describe('monthlyPayment', () => {
  it('matches the standard amortization formula', () => {
    // $20,000 at 6% for 60 months = $386.66 (well-known reference value)
    expect(monthlyPayment(20000, 6, 60)).toBeCloseTo(386.66, 2);
  });
  it('handles 0% APR', () => {
    expect(monthlyPayment(12000, 0, 48)).toBe(250);
  });
  it('returns 0 for nothing financed', () => {
    expect(monthlyPayment(0, 7, 60)).toBe(0);
  });
});

describe('calculatePayment', () => {
  const base = { price: 25000, downPayment: 3000, tradeInValue: 0, tradeInPayoff: 0, aprPercent: 7, termMonths: 60, taxRatePercent: 6, fees: 500 };

  it('adds tax and fees, subtracts down payment', () => {
    const r = calculatePayment(base);
    expect(r.salesTax).toBe(1500);
    expect(r.amountFinanced).toBe(24000);
  });

  it('gives a tax credit for the trade-in and rolls in negative equity', () => {
    const r = calculatePayment({ ...base, tradeInValue: 8000, tradeInPayoff: 10000 });
    expect(r.salesTax).toBe(1020); // 6% of (25000 - 8000)
    expect(r.netTrade).toBe(-2000);
    expect(r.amountFinanced).toBe(25000 + 1020 + 500 - 3000 + 2000);
  });

  it('never finances a negative amount', () => {
    expect(calculatePayment({ ...base, downPayment: 40000 }).amountFinanced).toBe(0);
  });
});
