// =============================================================================
// "Garage" = saved favorites + compare list, persisted per browser.
// With customer accounts, this would sync to the server instead.
//
// Uses React Context: a way to share state with any component without
// passing props down through every level. Any component can call
// useGarage() to read or change favorites / compare.
// =============================================================================
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface Garage {
  favorites: number[];
  compare: number[];
  toggleFavorite: (id: number) => void;
  toggleCompare: (id: number) => void;
  clearCompare: () => void;
  isFavorite: (id: number) => boolean;
  isComparing: (id: number) => boolean;
}

export const MAX_COMPARE = 3;
const Ctx = createContext<Garage | null>(null);

/**
 * Custom hook: like useState, but the value is saved to localStorage under `key`
 * and loaded back on the next visit. (The function passed to useState runs only
 * once, on first render, so we only read storage once.)
 */
function usePersisted(key: string): [number[], (fn: (prev: number[]) => number[]) => void] {
  const [value, setValue] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  }, [key, value]);
  return [value, setValue];
}

/** Add the id if missing, remove it if present. If the list is full, drop the oldest. */
const toggle = (list: number[], id: number, max = Infinity) =>
  list.includes(id) ? list.filter((x) => x !== id) : list.length >= max ? [...list.slice(1), id] : [...list, id];

/** Wrap the app in this (see main.tsx) so every component can use useGarage(). */
export function GarageProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = usePersisted('nl.favorites');
  const [compare, setCompare] = usePersisted('nl.compare');
  const value: Garage = {
    favorites,
    compare,
    toggleFavorite: (id) => setFavorites((p) => toggle(p, id)),
    toggleCompare: (id) => setCompare((p) => toggle(p, id, MAX_COMPARE)),
    clearCompare: () => setCompare(() => []),
    isFavorite: (id) => favorites.includes(id),
    isComparing: (id) => compare.includes(id),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Hook components call to access the garage. Throws a clear error if used outside the provider. */
export function useGarage() {
  const g = useContext(Ctx);
  if (!g) throw new Error('useGarage must be used inside GarageProvider');
  return g;
}
