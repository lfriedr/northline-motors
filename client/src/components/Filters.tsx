// =============================================================================
// Filters — the search sidebar (and mobile filter drawer).
//
// This component doesn't hold any state itself: it reads the current filters
// from the URL (params) and reports changes up via onChange. The Inventory
// page owns the URL. That keeps one source of truth.
// =============================================================================
import type { Facets, FacetValue } from '../types';

interface Props {
  /** Available options + counts from /api/facets (null while loading) */
  facets: Facets | null;
  /** Current URL query string, e.g. ?make=Toyota,Honda&maxPrice=20000 */
  params: URLSearchParams;
  /** Set (or clear, with null) one filter */
  onChange: (key: string, value: string | null) => void;
  onReset: () => void;
}

/** Read a comma-separated URL value as an array: "Toyota,Honda" → ['Toyota','Honda'] */
const csv = (p: URLSearchParams, k: string) => (p.get(k) || '').split(',').filter(Boolean);

export default function Filters({ facets, params, onChange, onReset }: Props) {
  // Loading placeholder.
  if (!facets) return <div className="h-96 animate-pulse rounded-xl bg-slate-200" />;

  // For multi-select filters: add or remove one value from the comma list.
  const toggleIn = (key: string, value: string) => {
    const cur = csv(params, key);
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    onChange(key, next.length ? next.join(',') : null);
  };

  // Models are "dependent" on makes: only show models for the makes picked.
  const selectedMakes = csv(params, 'make');
  const models = facets.model.filter((m) => selectedMakes.includes(m.make));
  const { bounds } = facets;
  const priceSteps = [10000, 15000, 20000, 25000, 30000, 40000, 50000].filter((p) => p >= bounds.minPrice);
  const yearSteps = Array.from({ length: bounds.maxYear - bounds.minYear + 1 }, (_, i) => bounds.maxYear - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">Filters</h2>
        <button onClick={onReset} className="text-sm text-slate-500 underline hover:text-ink">Reset all</button>
      </div>

      <Section title="Price">
        <select className="input" value={params.get('maxPrice') || ''} onChange={(e) => onChange('maxPrice', e.target.value || null)} aria-label="Maximum price">
          <option value="">Any price</option>
          {priceSteps.map((p) => <option key={p} value={p}>Under ${p.toLocaleString()}</option>)}
        </select>
      </Section>

      <Section title="Make">
        <CheckList items={facets.make} selected={selectedMakes} onToggle={(v) => toggleIn('make', v)} />
      </Section>

      {models.length > 0 && (
        <Section title="Model">
          <CheckList items={models} selected={csv(params, 'model')} onToggle={(v) => toggleIn('model', v)} />
        </Section>
      )}

      <Section title="Body style">
        <div className="flex flex-wrap gap-2">
          {facets.body.map((b) => {
            const on = csv(params, 'body').includes(b.value);
            return (
              <button key={b.value} onClick={() => toggleIn('body', b.value)} aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-sm ${on ? 'border-ink bg-ink text-white' : 'border-slate-300 bg-white hover:border-ink'}`}>
                {b.value} <span className="opacity-60">{b.count}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Year">
        <select className="input" value={params.get('minYear') || ''} onChange={(e) => onChange('minYear', e.target.value || null)} aria-label="Minimum year">
          <option value="">Any year</option>
          {yearSteps.map((y) => <option key={y} value={y}>{y} or newer</option>)}
        </select>
      </Section>

      <Section title="Mileage">
        <select className="input" value={params.get('maxMiles') || ''} onChange={(e) => onChange('maxMiles', e.target.value || null)} aria-label="Maximum mileage">
          <option value="">Any mileage</option>
          {[30000, 50000, 75000, 100000].map((m) => <option key={m} value={m}>Under {m.toLocaleString()} mi</option>)}
        </select>
      </Section>

      <Section title="Drivetrain">
        <CheckList items={facets.drivetrain} selected={csv(params, 'drivetrain')} onToggle={(v) => toggleIn('drivetrain', v)} />
      </Section>

      <Section title="Fuel type">
        <CheckList items={facets.fuel} selected={csv(params, 'fuel')} onToggle={(v) => toggleIn('fuel', v)} />
      </Section>
    </div>
  );
}

/** A labelled group of controls. <fieldset>/<legend> groups them for screen readers. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="label">{title}</legend>
      {children}
    </fieldset>
  );
}

/** A scrollable list of checkboxes with match counts on the right. */
function CheckList({ items, selected, onToggle }: { items: FacetValue[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
      {items.map((i) => (
        <li key={i.value}>
          <label className="flex cursor-pointer items-center justify-between rounded px-1 py-1 text-sm hover:bg-slate-50">
            <span className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-ink" checked={selected.includes(i.value)} onChange={() => onToggle(i.value)} />
              {i.value}
            </span>
            <span className="text-xs text-slate-400">{i.count}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
