// =============================================================================
// Home page — /
//
// Goal: get shoppers into inventory fast. A hero with a quick search,
// shortcut tiles by body style / budget, featured cars, and the
// "how online buying works" pitch.
// =============================================================================
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import VehicleCard from '../components/VehicleCard';
import type { Vehicle } from '../types';

export default function Home() {
  const navigate = useNavigate(); // lets us change pages from code (on form submit)
  const [q, setQ] = useState('');
  const [featured, setFeatured] = useState<Vehicle[]>([]);

  useEffect(() => {
    document.title = 'Northline Motors — Used Cars Online (Demo)';
    // Featured = 4 lowest-mileage cars. URLSearchParams builds "?sort=miles_asc&pageSize=4".
    api.search(new URLSearchParams({ sort: 'miles_asc', pageSize: '4' })).then((r) => setFeatured(r.results)).catch(() => {});
  }, []);

  // Shortcut tiles. Each just links to the inventory page with filters pre-set in the URL.
  const shortcuts = [
    { label: 'SUVs', to: '/inventory?body=SUV' },
    { label: 'Trucks', to: '/inventory?body=Truck' },
    { label: 'Sedans', to: '/inventory?body=Sedan' },
    { label: 'Electric & Hybrid', to: '/inventory?fuel=Electric,Hybrid' },
    { label: 'Under $20k', to: '/inventory?maxPrice=20000' },
    { label: 'Low miles', to: '/inventory?maxMiles=30000' },
  ];

  return (
    <>
      {/* Hero section */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight md:text-5xl">
            Your next car, bought <span className="text-accent">entirely online.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">Browse inspected used cars, get pre-qualified in minutes, sign from your phone, and get it delivered.</p>

          {/* Search form → sends the user to /inventory?q=... */}
          <form
            className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row"
            role="search"
            onSubmit={(e) => { e.preventDefault(); navigate(q.trim() ? `/inventory?q=${encodeURIComponent(q.trim())}` : '/inventory'); }}
          >
            <input className="input py-3 text-base text-slate-800" placeholder="Try “RAV4”, “F-150” or “Tesla”" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search vehicles" />
            <button className="btn-primary px-6 py-3 text-base">Search</button>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            {shortcuts.map((s) => <Link key={s.label} to={s.to} className="rounded-full border border-white/20 px-4 py-1.5 text-sm hover:bg-white/10">{s.label}</Link>)}
          </div>
        </div>
      </section>

      {/* Trust / value props — common on dealer sites */}
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:grid-cols-3">
        {[
          ['150-point inspection', 'Every car is inspected and reconditioned before listing.'],
          ['7-day returns', "Don't love it? Return it within 7 days."],
          ['Home delivery', 'We bring the car and paperwork to you.'],
        ].map(([h, p]) => (
          <div key={h} className="card p-5">
            <p className="font-semibold text-ink">{h}</p>
            <p className="mt-1 text-sm text-slate-500">{p}</p>
          </div>
        ))}
      </section>

      {/* Featured vehicles */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-bold text-ink">Low-mileage picks</h2>
          <Link to="/inventory" className="text-sm font-semibold text-ink underline">View all inventory →</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((v) => <VehicleCard key={v.id} v={v} />)}
        </div>
      </section>
    </>
  );
}
