// Credit / pre-qualification provider adapter.
//
// Real providers (700Credit QuickQualify, RouteOne, Dealertrack) require dealer
// credentials and a signed agreement, so this demo ships a mock that implements
// the same interface. Swap in a real implementation by setting CREDIT_PROVIDER.
//
// interface CreditProvider {
//   prequalify(applicant): Promise<{ approved, tier, estimatedApr, maxAmount, reference }>
// }

// Credit tiers: minimum score for each tier and an illustrative APR.
// Order matters — find() returns the first tier the score qualifies for.
const TIERS = [
  { tier: 'Excellent', minScore: 720, apr: 6.49 },
  { tier: 'Good', minScore: 660, apr: 8.99 },
  { tier: 'Fair', minScore: 600, apr: 13.49 },
  { tier: 'Rebuilding', minScore: 0, apr: 18.99 },
];
const BAND_TO_SCORE = { excellent: 750, good: 690, fair: 630, poor: 560 };

class MockCreditProvider {
  name = 'mock';

  /** Soft-pull style estimate. Uses self-reported band + income; no SSN needed. */
  async prequalify({ creditBand, monthlyIncome, monthlyHousing }) {
    const score = BAND_TO_SCORE[creditBand] ?? 600;
    const t = TIERS.find((x) => score >= x.minScore);
    // Keep total debt payments under ~40% of income (a common lender rule of thumb).
    const budget = Math.max(0, monthlyIncome * 0.4 - monthlyHousing);
    const maxPayment = Math.min(budget, monthlyIncome * 0.15);
    // Work backwards from the max monthly payment to the max loan amount
    // (the inverse of the loan payment formula), over a 72-month term.
    const r = t.apr / 1200; // monthly interest rate (APR% / 100 / 12)
    const n = 72;
    const maxAmount = Math.round((maxPayment * (1 - Math.pow(1 + r, -n))) / r / 500) * 500;
    return {
      provider: this.name,
      approved: maxAmount >= 5000,
      tier: t.tier,
      estimatedApr: t.apr,
      maxPayment: Math.round(maxPayment),
      maxAmount,
      reference: 'PQ-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    };
  }
}

// class SevenHundredCreditProvider { ... }   // TODO: real adapter
// class RouteOneProvider { ... }

/**
 * Factory: returns whichever provider the environment asks for.
 * The rest of the app only ever calls getCreditProvider().prequalify(...),
 * so switching to a real lender is a config change, not a rewrite.
 * (This is the "adapter pattern" — worth mentioning in interviews/proposals.)
 */
export function getCreditProvider() {
  switch (process.env.CREDIT_PROVIDER) {
    default:
      return new MockCreditProvider();
  }
}
