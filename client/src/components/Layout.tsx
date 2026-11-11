// =============================================================================
// Layout — the frame around every page: demo banner, header/nav, footer,
// and the floating compare tray. The current page renders where <Outlet /> is.
// =============================================================================
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useGarage } from '../state/garage';
import CompareTray from './CompareTray';

export default function Layout() {
  const { favorites } = useGarage();            // for the ♥ count badge
  const [menuOpen, setMenuOpen] = useState(false); // mobile hamburger menu open?
  const { pathname } = useLocation();          // current URL path

  // Whenever the page changes: close the mobile menu and scroll to the top
  // (single-page apps don't do this automatically like normal websites).
  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0); }, [pathname]);

  // Nav items defined as data, rendered twice below (desktop + mobile menu).
  const links = [
    { to: '/inventory', label: 'Shop cars' },
    { to: '/financing', label: 'Get pre-qualified' },
    { to: '/compare', label: 'Compare' },
    { to: '/dealer', label: 'Dealer login' },
  ];
  // NavLink passes isActive=true when its URL is the current page → highlight it.
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Always-visible disclaimer so nobody mistakes the demo for a real dealer. */}
      <div className="bg-accent px-4 py-1.5 text-center text-xs font-semibold text-ink">
        Portfolio demo · fictional dealership · no real vehicles, credit checks or payments
      </div>
      <header className="sticky top-0 z-30 bg-ink">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent font-black text-ink">N</span>
            <span className="text-lg font-bold tracking-tight">Northline<span className="text-accent">Motors</span></span>
          </Link>
          {/* Desktop nav: hidden on phones ("hidden"), shown from the md breakpoint up ("md:flex"). */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => <NavLink key={l.to} to={l.to} className={navClass}>{l.label}</NavLink>)}
            <NavLink to="/favorites" className={navClass} aria-label="Saved vehicles">
              ♥ <span className="ml-1 rounded-full bg-accent px-1.5 text-xs text-ink">{favorites.length}</span>
            </NavLink>
          </nav>
          {/* Hamburger button: phones only. The icon switches between ☰ and ✕ paths. */}
          <button className="rounded-md p-2 text-white md:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" aria-expanded={menuOpen}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} /></svg>
          </button>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-white/10 px-4 pb-4 pt-2 md:hidden">
            {links.map((l) => <NavLink key={l.to} to={l.to} className={navClass}>{l.label}</NavLink>)}
            <NavLink to="/favorites" className={navClass}>Saved ({favorites.length})</NavLink>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <CompareTray />

      <footer className="bg-ink text-slate-400">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm md:grid-cols-3">
          <div>
            <p className="font-bold text-white">Northline Motors</p>
            <p className="mt-2">Shop, finance and sign online. Delivered to your door.</p>
          </div>
          <div>
            <p className="font-semibold text-white">Shop</p>
            <ul className="mt-2 space-y-1">
              <li><Link to="/inventory?body=SUV" className="hover:text-white">SUVs</Link></li>
              <li><Link to="/inventory?body=Truck" className="hover:text-white">Trucks</Link></li>
              <li><Link to="/inventory?maxPrice=20000" className="hover:text-white">Under $20k</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">About this demo</p>
            <p className="mt-2">A portfolio project: React + Node + SQL. All vehicles, VINs, photos and credit decisions are simulated.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
