// =============================================================================
// Compare page — /compare
//
// Side-by-side table of up to 3 vehicles the shopper ticked "Compare" on.
// The ids come from the garage context (saved in localStorage); we fetch the
// full vehicle data from the API in one request.
// =============================================================================
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { miles, money, title } from '../lib/format';
import { useGarage } from '../state/garage';
import type { Vehicle } from '../types';

// Each row of the table: a label and a function that pulls that value off a vehicle.
// Defining rows as data keeps the JSX short and makes adding a row a one-liner.
const ROWS: [string, (v: Vehicle) => string][] = [
  ['Price', (v) => money(v.price)],
  ['Mileage', (v) => miles(v.mileage)],
  ['Trim', (v) => v.trim ?? '—'],
  ['Body', (v) => v.body],
  ['Drivetrain', (v) => v.drivetrain],
  ['Engine', (v) => v.engine ?? '—'],
  ['Fuel', (v) => v.fuel],
  ['MPG (city/hwy)', (v) => `${v.mpgCity} / ${v.mpgHwy}`],
  ['Color', (v) => `${v.exteriorColor} / ${v.interiorColor}`],
  ['Features', (v) => `${v.features.length} listed`],
];

export default function Compare() {
  const { compare, toggleCompare } = useGarage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Refetch whenever the compare list changes (e.g. user removes one).
  useEffect(() => {
    document.title = 'Compare vehicles · Northline Motors';
    api.byIds(compare).then(setVehicles).catch(() => setVehicles([]));
  }, [compare]);

  if (compare.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-ink">Nothing to compare yet</h1>
        <p className="mt-2 text-slate-500">Tick “Compare” on up to 3 vehicles to see them side by side.</p>
        <Link to="/inventory" className="btn-primary mt-6">Browse inventory</Link>
      </div>
    );
  }

  // Highlight the "best" value in numeric rows (lowest price / lowest miles).
  const lowestPrice = Math.min(...vehicles.map((v) => v.price));
  const lowestMiles = Math.min(...vehicles.map((v) => v.mileage));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-ink">Compare vehicles</h1>
      {/* overflow-x-auto lets the table scroll sideways on narrow phones */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className="w-40 p-4" />
              {vehicles.map((v) => (
                <th key={v.id} className="p-4 text-left align-top font-normal">
                  <img src={v.photos[0]} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                  <Link to={`/vehicles/${v.id}`} className="mt-2 block font-semibold text-ink hover:underline">{title(v)}</Link>
                  <button onClick={() => toggleCompare(v.id)} className="mt-1 text-xs text-slate-500 underline">Remove</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, get]) => (
              <tr key={label} className="border-t border-slate-100">
                <th scope="row" className="p-4 text-left font-medium text-slate-500">{label}</th>
                {vehicles.map((v) => {
                  const best = (label === 'Price' && v.price === lowestPrice) || (label === 'Mileage' && v.mileage === lowestMiles);
                  return <td key={v.id} className={`p-4 ${best && vehicles.length > 1 ? 'font-semibold text-green-700' : 'text-ink'}`}>{get(v)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
