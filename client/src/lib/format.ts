// =============================================================================
// Display formatting helpers — keep number/text formatting consistent everywhere.
// =============================================================================
import type { Vehicle } from '../types';

/** 23995 → "$23,995"   (cents=true → "$23,995.00") */
export const money = (n: number, cents = false) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents ? 2 : 0, minimumFractionDigits: cents ? 2 : 0 });

/** 45200 → "45,200 mi" */
export const miles = (n: number) => `${n.toLocaleString('en-US')} mi`;

/** → "2021 Toyota RAV4" */
export const title = (v: Pick<Vehicle, 'year' | 'make' | 'model'>) => `${v.year} ${v.make} ${v.model}`;

/** Human-friendly names for the status codes stored in the database. */
export const STATUS_LABEL: Record<Vehicle['status'], string> = {
  available: 'Available',
  pending: 'Sale pending',
  sold: 'Sold',
  in_recon: 'In reconditioning',
};
