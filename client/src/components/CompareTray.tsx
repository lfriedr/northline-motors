import { Link, useLocation } from 'react-router-dom';
import { MAX_COMPARE, useGarage } from '../state/garage';

// =============================================================================
// CompareTray — the bar that slides up from the bottom once a shopper ticks
// "Compare" on a car. Shows how many are selected and links to /compare.
// =============================================================================
export default function CompareTray() {
  const { compare, clearCompare } = useGarage();
  const { pathname } = useLocation();
  // Don't show it if nothing is selected, or on pages where it'd be redundant.
  if (!compare.length || pathname === '/compare' || pathname === '/dealer') return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm text-slate-600">
          <strong className="text-ink">{compare.length}</strong> of {MAX_COMPARE} selected to compare
        </p>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={clearCompare}>Clear</button>
          <Link to="/compare" className="btn-dark" aria-disabled={compare.length < 2}>
            Compare {compare.length > 1 ? 'now' : '(add 1 more)'}
          </Link>
        </div>
      </div>
    </div>
  );
}
