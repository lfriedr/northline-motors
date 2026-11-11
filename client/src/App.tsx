// =============================================================================
// App — the route table. Maps each URL path to a page component.
// =============================================================================
import { Link, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import VehicleDetail from './pages/VehicleDetail';
import Compare from './pages/Compare';
import Favorites from './pages/Favorites';
import Financing from './pages/Financing';
import Dealer from './pages/Dealer';

export default function App() {
  return (
    <Routes>
      {/* Layout (header/footer) wraps every page; the page renders inside its <Outlet />. */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />                              {/* /            */}
        <Route path="inventory" element={<Inventory />} />              {/* /inventory   */}
        <Route path="vehicles/:id" element={<VehicleDetail />} />       {/* /vehicles/12 */}
        <Route path="compare" element={<Compare />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="financing" element={<Financing />} />
        <Route path="dealer" element={<Dealer />} />
        <Route path="*" element={<NotFound />} />                       {/* anything else */}
      </Route>
    </Routes>
  );
}

/** Shown for unknown URLs. */
function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-ink">Page not found</h1>
      <Link to="/inventory" className="btn-primary mt-6">Browse inventory</Link>
    </div>
  );
}
