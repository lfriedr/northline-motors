// Auto-loan math. Kept pure + unit-tested because dealers check these numbers.

export interface PaymentInput {
  price: number;
  downPayment: number;
  tradeInValue: number;
  tradeInPayoff: number;
  aprPercent: number;
  termMonths: number;
  taxRatePercent: number;
  /** Doc, title & registration fees (taxable treatment varies by state; treated as non-taxable here). */
  fees: number;
  /** Most states tax only the price minus the trade-in allowance. */
  taxCreditForTrade?: boolean;
}

export interface PaymentResult {
  monthly: number;
  amountFinanced: number;
  salesTax: number;
  totalInterest: number;
  totalCost: number;
  netTrade: number;
}

/**
 * Standard loan amortization formula:
 *
 *   payment = P × r / (1 − (1 + r)^−n)
 *
 *   P = principal (amount financed)
 *   r = monthly interest rate  (APR 7% → 0.07 / 12)
 *   n = number of monthly payments
 *
 * At 0% APR the formula divides by zero, so we just split P evenly.
 */
export function monthlyPayment(principal: number, aprPercent: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  const r = aprPercent / 100 / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

/**
 * Full deal math, the way a dealer's desking tool does it:
 *
 *   amount financed = price + sales tax + fees − down payment − trade equity
 *
 * Trade equity = what the trade is worth − what's still owed on it.
 * If they owe MORE than it's worth ("upside down"), equity is negative and
 * that shortfall gets added to the new loan.
 */
export function calculatePayment(i: PaymentInput): PaymentResult {
  const netTrade = i.tradeInValue - i.tradeInPayoff; // negative equity rolls into the loan
  // In most states you only pay sales tax on (price − trade-in value).
  const taxable = Math.max(0, i.price - (i.taxCreditForTrade === false ? 0 : i.tradeInValue));
  const salesTax = round2(taxable * (i.taxRatePercent / 100));
  const amountFinanced = Math.max(0, round2(i.price + salesTax + i.fees - i.downPayment - netTrade));
  const monthly = round2(monthlyPayment(amountFinanced, i.aprPercent, i.termMonths));
  // Interest = everything paid over the loan − the amount borrowed.
  const totalPaid = monthly * i.termMonths;
  const totalInterest = Math.max(0, round2(totalPaid - amountFinanced));
  return {
    monthly,
    amountFinanced,
    salesTax,
    totalInterest,
    totalCost: round2(totalPaid + i.downPayment + Math.max(0, netTrade)),
    netTrade,
  };
}

/** Typical used-car APRs by credit tier (illustrative, for the demo). */
export const APR_BY_CREDIT = {
  excellent: { label: 'Excellent (720+)', apr: 6.49 },
  good: { label: 'Good (660–719)', apr: 8.99 },
  fair: { label: 'Fair (600–659)', apr: 13.49 },
  poor: { label: 'Rebuilding (<600)', apr: 18.99 },
} as const;
export type CreditBand = keyof typeof APR_BY_CREDIT;

/** Round to cents. Avoids floating-point noise like 386.66000000000003. */
const round2 = (n: number) => Math.round(n * 100) / 100;
