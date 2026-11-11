// =============================================================================
// Inventory / search results — /inventory
//
// Flow: URL changes → fetch matching cars from the API → render the grid.
// Filters, sort and page number all live in the URL query string.
// =============================================================================
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import Filters from '../components/Filters';
import VehicleCard from '../components/VehicleCard';
import type { Facets, SearchResponse } from '../types';

const SORTS = [
  ['newest', 'Newest listings'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['miles_asc', 'Lowest mileage'],
  ['year_desc', 'Newest year'],
];

export default function Inventory() {
  // All search state lives in the URL → shareable, back-button friendly, crawlable.
  const [params, setParams] = useSearchParams();
  const [facets, setFacets] = useState<Facets | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(false);          // mobile filter drawer open?
  const [q, setQ] = useState(params.get('q') || '');    // search box text (only applied on submit)

  // Load filter options once, when the page first mounts ([] = no dependencies).
  useEffect(() => { api.facets().then(setFacets).catch(() => setError('Could not load filters')); }, []);

  // Re-run the search every time the URL params change.
  // `cancelled` guards against a race: if the user clicks two filters quickly,
  // the slower first response must not overwrite the newer results.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.search(params)
      .then((d) => { if (!cancelled) { setData(d); setError(''); } })
      .catch(() => !cancelled && setError('Could not load inventory. Is the API running?'))
      .finally(() => !cancelled && setLoading(false));
    document.title = 'Shop used cars · Northline Motors';
    return () => { cancelled = true; };
  }, [params]);

  /** Change one URL param. Changing a filter resets to page 1; changing make clears model. */
  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key === 'make') next.delete('model');
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const page = Number(params.get('page') || 1);
  const pages = data ? Math.ceil(data.total / data.pageSize) : 1;
  const activeCount = [...params.keys()].filter((k) => !['sort', 'page'].includes(k)).length;

  // Build the filter panel once and place it in two spots: desktop sidebar + mobile drawer.
  const filters = <Filters facets={facets} params={params} onChange={update} onReset={() => { setQ(''); setParams({}); }} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-24">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Shop used cars</h1>
          <p className="text-sm text-slate-500" aria-live="polite">{data ? `${data.total} vehicles match` : 'Loading…'}</p>
        </div>
        <form className="flex gap-2 md:w-[28rem]" onSubmit={(e) => { e.preventDefault(); update('q', q.trim() || null); }} role="search">
          <input className="input" placeholder="Search make, model, stock # or VIN" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search inventory" />
          <button className="btn-dark">Search</button>
        </form>
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-4">{filters}</div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button className="btn-ghost lg:hidden" onClick={() => setDrawer(true)}>
              Filters {activeCount > 0 && <span className="rounded-full bg-ink px-1.5 text-xs text-white">{activeCount}</span>}
            </button>
            <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
              Sort
              <select className="input w-auto" value={params.get('sort') || 'newest'} onChange={(e) => update('sort', e.target.value)}>
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>

          {error && <p className="card p-6 text-red-600">{error}</p>}

          {!error && (
            <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
              {data?.results.map((v) => <VehicleCard key={v.id} v={v} />)}
              {!data && Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-slate-200" />)}
            </div>
          )}

          {data && data.total === 0 && (
            <div className="card p-10 text-center">
              <p className="font-semibold text-ink">No vehicles match those filters.</p>
              <button className="btn-ghost mt-4" onClick={() => setParams({})}>Clear filters</button>
            </div>
          )}

          {pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              <button className="btn-ghost" disabled={page <= 1} onClick={() => update('page', String(page - 1))}>← Prev</button>
              <span className="px-3 text-sm text-slate-600">Page {page} of {pages}</span>
              <button className="btn-ghost" disabled={page >= pages} onClick={() => update('page', String(page + 1))}>Next →</button>
            </nav>
          )}
        </section>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-white p-5 shadow-xl">
            {filters}
            <button className="btn-dark sticky bottom-0 mt-6 w-full" onClick={() => setDrawer(false)}>
              Show {data?.total ?? ''} results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
