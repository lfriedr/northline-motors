// =============================================================================
// Saved vehicles — /favorites
//
// Lists every car the shopper hearted. Ids live in localStorage (see
// state/garage.tsx); with customer accounts they'd be stored server-side so
// they follow the user across devices.
// =============================================================================
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import VehicleCard from '../components/VehicleCard';
import { useGarage } from '../state/garage';
import type { Vehicle } from '../types';

export default function Favorites() {
  const { favorites } = useGarage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    document.title = 'Saved vehicles · Northline Motors';
    api.byIds(favorites).then(setVehicles).catch(() => setVehicles([]));
  }, [favorites]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24">
      <h1 className="mb-6 text-2xl font-bold text-ink">Saved vehicles</h1>
      {favorites.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-600">Tap the ♡ on any car to save it here.</p>
          <Link to="/inventory" className="btn-primary mt-4">Browse inventory</Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {vehicles.map((v) => <VehicleCard key={v.id} v={v} />)}
        </div>
      )}
    </div>
  );
}
