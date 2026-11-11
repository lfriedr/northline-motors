// =============================================================================
// VehicleCard — one car in a results grid: photo, title, price, estimated
// monthly payment, quick tags, plus save (♥) and compare controls.
// Used on Home, Inventory, Favorites and "Similar vehicles".
// =============================================================================
import { Link } from 'react-router-dom';
import type { Vehicle } from '../types';
import { miles, money, title } from '../lib/format';
import { calculatePayment } from '../lib/payment';
import { useGarage } from '../state/garage';

/** "Est. $xxx/mo" on cards uses fixed assumptions, disclosed in the tooltip. */
const estimate = (price: number) =>
  calculatePayment({ price, downPayment: price * 0.1, tradeInValue: 0, tradeInPayoff: 0, aprPercent: 8.99, termMonths: 72, taxRatePercent: 6, fees: 400 }).monthly;

export default function VehicleCard({ v }: { v: Vehicle }) {
  const { isFavorite, toggleFavorite, isComparing, toggleCompare } = useGarage();
  const fav = isFavorite(v.id);
  return (
    // "group" lets children react to hovering the whole card (group-hover:scale zooms the photo).
    <article className="card group relative flex flex-col overflow-hidden transition hover:shadow-md">
      <Link to={`/vehicles/${v.id}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
        {/* loading="lazy": the browser only downloads images as they scroll into view → faster pages. */}
        <img src={v.photos[0]} alt={`${title(v)} ${v.trim ?? ''}`} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        {v.status === 'pending' && <span className="absolute left-3 top-3 rounded bg-ink px-2 py-0.5 text-xs font-semibold text-white">Sale pending</span>}
      </Link>
      {/* Save button. aria-pressed / aria-label tell screen readers what it does and its state. */}
      <button
        onClick={() => toggleFavorite(v.id)}
        aria-pressed={fav}
        aria-label={fav ? 'Remove from saved' : 'Save vehicle'}
        className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg shadow ${fav ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
      >
        {fav ? '♥' : '♡'}
      </button>
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/vehicles/${v.id}`} className="hover:underline">
          <h3 className="font-semibold text-ink">{title(v)}</h3>
        </Link>
        <p className="text-sm text-slate-500">{v.trim} · {miles(v.mileage)}</p>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-xl font-bold text-ink">{money(v.price)}</p>
          <p className="text-sm text-slate-500" title="10% down, 72 mo @ 8.99% APR, 6% tax. Estimate only.">
            est. <strong className="text-slate-700">{money(estimate(v.price))}</strong>/mo
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-slate-600">
          <span className="rounded bg-slate-100 px-2 py-0.5">{v.drivetrain}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5">{v.fuel}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5">{v.exteriorColor}</span>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
          <input type="checkbox" checked={isComparing(v.id)} onChange={() => toggleCompare(v.id)} className="h-4 w-4 accent-ink" />
          Compare
        </label>
      </div>
    </article>
  );
}
