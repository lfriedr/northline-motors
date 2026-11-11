// =============================================================================
// Vehicle Detail Page (VDP) — /vehicles/:id
//
// The most important page on any dealer site: this is where shoppers decide.
// It shows the photo gallery, price, key specs, history summary, features,
// a payment calculator, and lead-capture forms (question / test drive).
// =============================================================================
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import Gallery from '../components/Gallery';
import LeadForm from '../components/LeadForm';
import PaymentCalculator from '../components/PaymentCalculator';
import VehicleCard from '../components/VehicleCard';
import { miles, money, STATUS_LABEL, title } from '../lib/format';
import { useGarage } from '../state/garage';
import type { Vehicle } from '../types';

export default function VehicleDetail() {
  // useParams reads the ":id" part of the URL, e.g. /vehicles/12 → id = "12".
  const { id } = useParams();

  // Three pieces of local state: the vehicle, similar vehicles, and an error message.
  const [v, setV] = useState<Vehicle | null>(null);
  const [similar, setSimilar] = useState<Vehicle[]>([]);
  const [error, setError] = useState('');

  // Favorites / compare helpers from our shared "garage" context.
  const { isFavorite, toggleFavorite, isComparing, toggleCompare } = useGarage();

  // Load the vehicle whenever the id in the URL changes
  // (e.g. clicking a "similar vehicle" link reuses this same component).
  useEffect(() => {
    setV(null);
    api.vehicle(id!)
      .then(({ vehicle, similar }) => {
        setV(vehicle);
        setSimilar(similar);
        // Set a descriptive browser-tab title — also helps SEO.
        document.title = `Used ${title(vehicle)} ${vehicle.trim ?? ''} for sale · Northline Motors`;
      })
      .catch(() => setError('Vehicle not found'));
  }, [id]);

  if (error) return <p className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-600">{error}. <Link className="underline" to="/inventory">Back to inventory</Link></p>;

  // Loading skeleton: grey boxes roughly where content will appear, so the page
  // doesn't "jump" when data arrives.
  if (!v) return <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]"><div className="aspect-[4/3] animate-pulse rounded-xl bg-slate-200" /><div className="h-96 animate-pulse rounded-xl bg-slate-200" /></div>;

  const name = `${title(v)} ${v.trim ?? ''}`.trim();

  // Quick-glance specs shown as a grid of tiles.
  const specs: [string, string][] = [
    ['Mileage', miles(v.mileage)],
    ['Drivetrain', v.drivetrain],
    ['Engine', v.engine ?? '—'],
    ['Transmission', v.transmission],
    ['Fuel', v.fuel],
    // Electric cars are rated in MPGe, gas cars in MPG.
    [v.fuel === 'Electric' ? 'MPGe' : 'MPG', `${v.mpgCity} city / ${v.mpgHwy} hwy`],
    ['Exterior', v.exteriorColor],
    ['Interior', v.interiorColor],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-24">
      {/* schema.org structured data: tells Google this page is a car listing, which
          enables rich results (price, mileage) in search. Big SEO win for dealers. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(v)) }} />

      {/* Breadcrumbs help users (and search engines) understand where they are. */}
      <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/inventory" className="hover:underline">Inventory</Link> /{' '}
        <Link to={`/inventory?make=${encodeURIComponent(v.make)}`} className="hover:underline">{v.make}</Link> / <span className="text-slate-700">{v.model}</span>
      </nav>

      {/* Two-column layout on large screens: content left, sticky sidebar right.
          On phones it collapses to a single column (mobile-first). */}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-8">
          <Gallery photos={v.photos} alt={name} />

          {/* Title + price block */}
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink md:text-3xl">{name}</h1>
              <p className="mt-1 text-sm text-slate-500">Stock #{v.stockNumber} · VIN {v.vin}</p>
              {v.status !== 'available' && <span className="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-800">{STATUS_LABEL[v.status]}</span>}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-ink">{money(v.price)}</p>
              <div className="mt-2 flex justify-end gap-2">
                <button className="btn-ghost" onClick={() => toggleFavorite(v.id)} aria-pressed={isFavorite(v.id)}>
                  {isFavorite(v.id) ? '♥ Saved' : '♡ Save'}
                </button>
                <button className="btn-ghost" onClick={() => toggleCompare(v.id)} aria-pressed={isComparing(v.id)}>
                  {isComparing(v.id) ? '✓ Comparing' : '+ Compare'}
                </button>
              </div>
            </div>
          </header>

          {/* Spec tiles */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-ink">Overview</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {specs.map(([k, val]) => (
                <div key={k} className="card p-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
                  <dd className="mt-0.5 font-medium text-ink">{val}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Vehicle history summary. Comes from the server's history adapter
              (mocked here; Carfax/AutoCheck in production). */}
          {v.history && (
            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink">Vehicle history</h2>
                <span className="text-xs text-slate-400">Simulated report</span>
              </div>
              <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <HistoryItem ok={v.history.accidents === 0} text={v.history.accidents === 0 ? 'No accidents reported' : `${v.history.accidents} accident reported`} />
                <HistoryItem ok={!v.history.titleIssues} text="Clean title" />
                <HistoryItem ok text={`${v.history.owners} previous owner${v.history.owners > 1 ? 's' : ''}`} />
                <HistoryItem ok text={`${v.history.serviceRecords} service records`} />
                <HistoryItem ok={v.history.personalUse} text={v.history.personalUse ? 'Personal use' : 'Fleet / rental use'} />
              </ul>
            </section>
          )}

          {v.features.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-ink">Features</h2>
              <ul className="grid gap-2 text-sm sm:grid-cols-2 md:grid-cols-3">
                {v.features.map((f) => <li key={f} className="flex items-center gap-2"><span className="text-green-600">✓</span>{f}</li>)}
              </ul>
            </section>
          )}

          {v.description && (
            <section>
              <h2 className="mb-2 text-lg font-semibold text-ink">Description</h2>
              <p className="leading-relaxed text-slate-600">{v.description}</p>
            </section>
          )}

          {/* "Next steps" mirrors the real online-buying flow. Checkout, e-sign and
              delivery are the next features to build (see README roadmap). */}
          <section className="card bg-ink p-6 text-white">
            <h2 className="text-lg font-semibold">Buy it 100% online</h2>
            <ol className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
              {['Get pre-qualified (no impact to credit)', 'Value your trade-in', 'Sign documents online', 'Schedule home delivery'].map((s, i) => (
                <li key={s} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent font-bold text-ink">{i + 1}</span>{s}</li>
              ))}
            </ol>
            <Link to={`/financing?vehicleId=${v.id}`} className="btn-primary mt-5">Start with pre-qualification</Link>
          </section>
        </div>

        {/* Sidebar: sticks to the top while scrolling on desktop */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          {/* key={v.id} resets the calculator's state when navigating between cars */}
          <PaymentCalculator key={v.id} price={v.price} compact />
          <LeadForm key={`lead-${v.id}`} vehicleId={v.id} vehicleTitle={name} />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold text-ink">Similar vehicles</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((s) => <VehicleCard key={s.id} v={s} />)}
          </div>
        </section>
      )}
    </div>
  );
}

/** A single ✓ / ! line in the history box. */
function HistoryItem({ ok, text }: { ok: boolean; text: string }) {
  return <li className="flex items-center gap-2"><span className={ok ? 'text-green-600' : 'text-amber-600'}>{ok ? '✓' : '!'}</span>{text}</li>;
}

/**
 * Builds schema.org "Car" structured data (JSON-LD).
 * Spec: https://schema.org/Car — Google reads this to show rich listings.
 */
function jsonLd(v: Vehicle) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${title(v)} ${v.trim ?? ''}`.trim(),
    vehicleIdentificationNumber: v.vin,
    brand: { '@type': 'Brand', name: v.make },
    model: v.model,
    vehicleModelDate: String(v.year),
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.mileage, unitCode: 'SMI' }, // SMI = statute miles
    color: v.exteriorColor,
    driveWheelConfiguration: v.drivetrain,
    fuelType: v.fuel,
    vehicleTransmission: v.transmission,
    itemCondition: 'https://schema.org/UsedCondition',
    offers: {
      '@type': 'Offer',
      price: v.price,
      priceCurrency: 'USD',
      availability: v.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/LimitedAvailability',
    },
  };
}
