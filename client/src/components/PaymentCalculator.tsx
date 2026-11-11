// =============================================================================
// PaymentCalculator — interactive "what will my monthly payment be?" widget.
// Every input is a piece of state; the result recalculates instantly using the
// tested math in lib/payment.ts.
// =============================================================================
import { useMemo, useState } from 'react';
import { APR_BY_CREDIT, calculatePayment, type CreditBand } from '../lib/payment';
import { money } from '../lib/format';

const TERMS = [36, 48, 60, 72, 84];

export default function PaymentCalculator({ price, compact = false }: { price: number; compact?: boolean }) {
  // Sensible defaults: ~10% down (rounded to $500), 72 months, "good" credit, 6% tax.
  const [down, setDown] = useState(Math.round((price * 0.1) / 500) * 500);
  const [term, setTerm] = useState(72);
  const [credit, setCredit] = useState<CreditBand>('good');
  const [apr, setApr] = useState<number>(APR_BY_CREDIT.good.apr);
  const [trade, setTrade] = useState(0);
  const [payoff, setPayoff] = useState(0);
  const [tax, setTax] = useState(6);

  // useMemo: only recalculate when one of the listed inputs changes.
  const r = useMemo(
    () => calculatePayment({ price, downPayment: down, tradeInValue: trade, tradeInPayoff: payoff, aprPercent: apr, termMonths: term, taxRatePercent: tax, fees: 450 }),
    [price, down, trade, payoff, apr, term, tax],
  );

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-ink">Estimate your payment</h2>
        <p className="text-right">
          <span className="text-3xl font-bold text-ink">{money(r.monthly)}</span>
          <span className="text-sm text-slate-500">/mo</span>
        </p>
      </div>

      <div className={`mt-4 grid gap-4 ${compact ? '' : 'sm:grid-cols-2'}`}>
        <div className="sm:col-span-2">
          <div className="flex justify-between"><span className="label">Down payment</span><span className="text-sm font-semibold">{money(down)}</span></div>
          <input type="range" min={0} max={Math.round(price * 0.5)} step={500} value={down} onChange={(e) => setDown(+e.target.value)} className="w-full accent-ink" aria-label="Down payment" />
        </div>

        <div className="sm:col-span-2">
          <span className="label">Term</span>
          <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Loan term">
            {TERMS.map((t) => (
              <button key={t} role="radio" aria-checked={term === t} onClick={() => setTerm(t)}
                className={`rounded-md border py-1.5 text-sm ${term === t ? 'border-ink bg-ink text-white' : 'border-slate-300 hover:border-ink'}`}>{t}</button>
            ))}
          </div>
        </div>

        <label>
          <span className="label">Credit</span>
          {/* Picking a credit band fills in a typical APR; the user can still type their own. */}
          <select className="input" value={credit} onChange={(e) => { const c = e.target.value as CreditBand; setCredit(c); setApr(APR_BY_CREDIT[c].apr); }}>
            {Object.entries(APR_BY_CREDIT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label>
          <span className="label">APR %</span>
          <input type="number" className="input" step={0.01} min={0} max={30} value={apr} onChange={(e) => setApr(+e.target.value)} />
        </label>
        <label>
          <span className="label">Trade-in value</span>
          <input type="number" className="input" min={0} step={500} value={trade} onChange={(e) => setTrade(+e.target.value)} />
        </label>
        <label>
          <span className="label">Owed on trade</span>
          <input type="number" className="input" min={0} step={500} value={payoff} onChange={(e) => setPayoff(+e.target.value)} />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Sales tax %</span>
          <input type="number" className="input" min={0} max={12} step={0.25} value={tax} onChange={(e) => setTax(+e.target.value)} />
        </label>
      </div>

      {/* Itemized breakdown — transparency builds trust with shoppers. */}
      <dl className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
        <Row k="Vehicle price" v={money(price)} />
        <Row k="Sales tax" v={money(r.salesTax)} />
        <Row k="Doc & title fees" v={money(450)} />
        <Row k="Down payment" v={`− ${money(down)}`} />
        {(trade > 0 || payoff > 0) && <Row k={r.netTrade >= 0 ? 'Trade-in equity' : 'Negative equity'} v={r.netTrade >= 0 ? `− ${money(r.netTrade)}` : `+ ${money(-r.netTrade)}`} />}
        <Row k="Amount financed" v={money(r.amountFinanced)} strong />
        <Row k="Total interest" v={money(r.totalInterest)} />
      </dl>
      <p className="mt-3 text-xs text-slate-400">Estimate only. Actual rate and terms depend on lender approval.</p>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-semibold text-ink' : 'text-slate-600'}`}>
      <dt>{k}</dt><dd>{v}</dd>
    </div>
  );
}
