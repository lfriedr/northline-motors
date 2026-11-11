// =============================================================================
// Dealer dashboard — /dealer   (demo password: "demo")
//
// The back-office side of the platform. Four tabs:
//   Overview  – key numbers (inventory value, days on lot, new leads, top viewed)
//   Inventory – table of every vehicle; change price and status inline
//   Leads     – every form submission; move it through new → contacted → won/lost
//   Add       – add a vehicle by VIN (it starts "In reconditioning")
//
// This is a lightweight stand-in for a DMS/CRM. In production, inventory would
// sync from the dealer's DMS (DealerCenter, Frazer…) and leads would push to the CRM.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, dealerToken } from '../api';
import { money, STATUS_LABEL, title } from '../lib/format';
import type { DealerStats, Lead, Vehicle, VehicleStatus } from '../types';

type Tab = 'overview' | 'inventory' | 'leads' | 'add';

export default function Dealer() {
  // If a token is saved, we're "logged in".
  const [authed, setAuthed] = useState(!!dealerToken.get());
  useEffect(() => { document.title = 'Dealer dashboard · Northline Motors'; }, []);
  return authed ? <Dashboard onLogout={() => { dealerToken.set(null); setAuthed(false); }} /> : <Login onLogin={() => setAuthed(true)} />;
}

// ---------------------------------------------------------------------------
// Login screen
// ---------------------------------------------------------------------------
function Login({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { token } = await api.dealer.login(pw);
      dealerToken.set(token); // saved so the API helper can send it on later requests
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <form onSubmit={submit} className="card space-y-4 p-6">
        <h1 className="text-xl font-bold text-ink">Dealer login</h1>
        <p className="text-sm text-slate-500">Demo password: <code className="rounded bg-slate-100 px-1">demo</code></p>
        <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" aria-label="Password" autoFocus />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-dark w-full">Sign in</button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard shell: loads all data once, then renders the active tab
// ---------------------------------------------------------------------------
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<DealerStats | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  // useCallback keeps the same function between renders so useEffect below
  // doesn't re-run forever. Promise.all fetches all three in parallel.
  const load = useCallback(async () => {
    try {
      const [s, v, l] = await Promise.all([api.dealer.stats(), api.dealer.vehicles(), api.dealer.leads()]);
      setStats(s); setVehicles(v); setLeads(l);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onLogout(); // token no longer valid
    }
  }, [onLogout]);

  useEffect(() => { load(); }, [load]);

  const tabs: [Tab, string][] = [['overview', 'Overview'], ['inventory', `Inventory (${vehicles.length})`], ['leads', `Leads (${leads.length})`], ['add', '+ Add vehicle']];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Dealer dashboard</h1>
        <button onClick={onLogout} className="btn-ghost">Sign out</button>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tab === key ? 'border-ink text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && stats && <Overview stats={stats} />}
      {tab === 'inventory' && <InventoryTable vehicles={vehicles} onChanged={load} />}
      {tab === 'leads' && <Leads leads={leads} onChanged={load} />}
      {tab === 'add' && <AddVehicle onAdded={() => { load(); setTab('inventory'); }} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab: KPI tiles + two simple lists/bar charts (pure CSS, no chart lib)
// ---------------------------------------------------------------------------
function Overview({ stats }: { stats: DealerStats }) {
  const get = (s: VehicleStatus) => stats.byStatus.find((x) => x.status === s);
  const totalLeads = stats.leads.reduce((a, l) => a + l.count, 0);
  const maxMake = Math.max(...stats.byMake.map((m) => m.count));

  const kpis = [
    ['Available units', String(get('available')?.count ?? 0)],
    ['Inventory value', money(get('available')?.value ?? 0)],
    ['Avg. days on lot', String(stats.avgDaysOnLot ?? '—')],
    ['New leads', `${stats.newLeads} of ${totalLeads}`],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([k, v]) => (
          <div key={k} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold text-ink">Most viewed listings</h2>
          <ol className="mt-3 divide-y divide-slate-100 text-sm">
            {stats.topViewed.map((v) => (
              <li key={v.id} className="flex justify-between py-2">
                <Link to={`/vehicles/${v.id}`} className="hover:underline">{title(v)} {v.trim}</Link>
                <span className="text-slate-500">{v.views} views</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-ink">Inventory by make</h2>
          {/* A bar chart made from plain divs: width = count / max. */}
          <ul className="mt-3 space-y-2 text-sm">
            {stats.byMake.map((m) => (
              <li key={m.make} className="grid grid-cols-[90px_1fr_30px] items-center gap-3">
                <span className="text-slate-600">{m.make}</span>
                <span className="h-3 rounded bg-ink" style={{ width: `${(m.count / maxMake) * 100}%` }} />
                <span className="text-right text-slate-500">{m.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inventory tab: filterable table with inline price + status editing
// ---------------------------------------------------------------------------
function InventoryTable({ vehicles, onChanged }: { vehicles: Vehicle[]; onChanged: () => void }) {
  const [filter, setFilter] = useState<VehicleStatus | 'all'>('all');
  const rows = filter === 'all' ? vehicles : vehicles.filter((v) => v.status === filter);

  // Saves one field change to the server, then reloads the dashboard data.
  const update = async (id: number, changes: Partial<Vehicle>) => {
    await api.dealer.updateVehicle(id, changes);
    onChanged();
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
        {(['all', 'available', 'pending', 'in_recon', 'sold'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-sm ${filter === s ? 'bg-ink text-white' : 'bg-slate-100 text-slate-600'}`}>
            {s === 'all' ? 'All' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="p-3">Vehicle</th><th className="p-3">Stock #</th><th className="p-3">Miles</th><th className="p-3">Price</th><th className="p-3">Views</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="p-3">
                  <Link to={`/vehicles/${v.id}`} className="font-medium text-ink hover:underline">{title(v)}</Link>
                  <span className="block text-xs text-slate-400">{v.trim} · {v.vin}</span>
                </td>
                <td className="p-3 text-slate-600">{v.stockNumber}</td>
                <td className="p-3 text-slate-600">{v.mileage.toLocaleString()}</td>
                <td className="p-3">
                  {/* defaultValue + onBlur: the user can type freely; we save when they leave the field. */}
                  <input type="number" step={100} defaultValue={v.price} aria-label={`Price for ${title(v)}`}
                    onBlur={(e) => Number(e.target.value) !== v.price && update(v.id, { price: Number(e.target.value) })}
                    className="input w-28 py-1" />
                </td>
                <td className="p-3 text-slate-600">{v.views}</td>
                <td className="p-3">
                  <select value={v.status} onChange={(e) => update(v.id, { status: e.target.value as VehicleStatus })} className="input w-40 py-1" aria-label={`Status for ${title(v)}`}>
                    {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leads tab: simple CRM pipeline
// ---------------------------------------------------------------------------
const LEAD_TYPE: Record<Lead['type'], string> = { inquiry: 'Question', test_drive: 'Test drive', prequal: 'Pre-qual', trade_in: 'Trade-in' };
const LEAD_COLOR: Record<Lead['status'], string> = { new: 'bg-blue-100 text-blue-800', contacted: 'bg-amber-100 text-amber-800', won: 'bg-green-100 text-green-800', lost: 'bg-slate-200 text-slate-600' };

function Leads({ leads, onChanged }: { leads: Lead[]; onChanged: () => void }) {
  const setStatus = async (id: number, status: Lead['status']) => { await api.dealer.updateLead(id, status); onChanged(); };
  if (!leads.length) return <p className="card p-8 text-center text-slate-500">No leads yet.</p>;
  return (
    <ul className="space-y-3">
      {leads.map((l) => (
        <li key={l.id} className="card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">{l.name}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{LEAD_TYPE[l.type]}</span>
              <span className={`rounded px-2 py-0.5 text-xs ${LEAD_COLOR[l.status]}`}>{l.status}</span>
            </div>
            <p className="text-sm text-slate-500">
              {l.email}{l.phone && ` · ${l.phone}`} · {new Date(l.createdAt.replace(' ', 'T') + 'Z').toLocaleString()}
            </p>
            {l.vehicleTitle && <p className="text-sm">Re: <Link to={`/vehicles/${l.vehicleId}`} className="underline">{l.vehicleTitle}</Link></p>}
            {l.message && <p className="mt-1 text-sm text-slate-700">“{l.message}”</p>}
            {l.type === 'prequal' && l.meta.tier != null && (
              <p className="mt-1 text-sm text-slate-700">Tier {String(l.meta.tier)} · {String(l.meta.estimatedApr)}% · up to {money(Number(l.meta.maxAmount))}</p>
            )}
          </div>
          <select value={l.status} onChange={(e) => setStatus(l.id, e.target.value as Lead['status'])} className="input w-full md:w-36" aria-label={`Status for ${l.name}`}>
            {(['new', 'contacted', 'won', 'lost'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Add vehicle tab
// Tip for a next step: call NHTSA's free vPIC API to decode the VIN and
// auto-fill year/make/model: https://vpic.nhtsa.dot.gov/api/
// ---------------------------------------------------------------------------
function AddVehicle({ onAdded }: { onAdded: () => void }) {
  const [f, setF] = useState({ vin: '', year: '2022', make: '', model: '', trim: '', body: 'Sedan', drivetrain: 'FWD', fuel: 'Gas', mileage: '', price: '', exteriorColor: 'Gray' });
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.dealer.createVehicle({ ...f, year: Number(f.year), mileage: Number(f.mileage), price: Number(f.price) });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add vehicle');
    }
  };

  // Reusable labelled input/select builders to keep the form below compact.
  const input = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label><span className="label">{label}</span><input className="input" value={f[k]} onChange={set(k)} {...props} /></label>
  );
  const select = (k: keyof typeof f, label: string, opts: string[]) => (
    <label><span className="label">{label}</span><select className="input" value={f[k]} onChange={set(k)}>{opts.map((o) => <option key={o}>{o}</option>)}</select></label>
  );

  return (
    <form onSubmit={submit} className="card grid max-w-3xl gap-4 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">{input('vin', 'VIN (17 characters)', { maxLength: 17, required: true, className: 'input font-mono uppercase' })}</div>
      {input('year', 'Year', { type: 'number', min: 1990, max: 2027, required: true })}
      {input('make', 'Make', { required: true })}
      {input('model', 'Model', { required: true })}
      {input('trim', 'Trim')}
      {select('body', 'Body', ['Sedan', 'SUV', 'Truck', 'Coupe', 'Wagon', 'Van'])}
      {select('drivetrain', 'Drivetrain', ['FWD', 'RWD', 'AWD', '4WD'])}
      {select('fuel', 'Fuel', ['Gas', 'Hybrid', 'Electric', 'Diesel'])}
      {input('exteriorColor', 'Exterior color')}
      {input('mileage', 'Mileage', { type: 'number', min: 0, required: true })}
      {input('price', 'Price ($)', { type: 'number', min: 0, step: 100, required: true })}
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <button className="btn-dark sm:col-span-2">Add to inventory</button>
    </form>
  );
}
