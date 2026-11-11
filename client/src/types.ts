// =============================================================================
// Shared TypeScript types — describe the JSON the API returns.
// TypeScript uses these to catch mistakes (typos, missing fields) before the
// code ever runs, and gives autocomplete in the editor.
// =============================================================================

/** Lifecycle of a car: available → pending (deal in progress) → sold.
 *  in_recon = just acquired, being inspected/cleaned; hidden from shoppers. */
export type VehicleStatus ='available' | 'pending' | 'sold' | 'in_recon';

export interface Vehicle {
  id: number;
  vin: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  body: string;
  drivetrain: string;
  fuel: string;
  transmission: string;
  engine: string | null;
  mpgCity: number | null;
  mpgHwy: number | null;
  mileage: number;
  price: number;
  exteriorColor: string;
  interiorColor: string;
  features: string[];
  description: string | null;
  photoCount: number;
  photos: string[];
  status: VehicleStatus;
  views: number;
  createdAt: string;
  history?: HistorySummary;
}

/** Summary of a vehicle history report (Carfax/AutoCheck shape; mocked in the demo). */
export interface HistorySummary {
  provider: string;
  owners: number;
  accidents: number;
  titleIssues: boolean;
  serviceRecords: number;
  lastOdometer: number;
  personalUse: boolean;
  reportUrl: string | null;
}

/** "Facets" = the filter options + how many cars match each (e.g. Toyota: 9). */
export interface FacetValue { value: string; count: number }
export interface Facets {
  make: FacetValue[];
  model: (FacetValue & { make: string })[];
  body: FacetValue[];
  drivetrain: FacetValue[];
  fuel: FacetValue[];
  bounds: { minPrice: number; maxPrice: number; minYear: number; maxYear: number; maxMiles: number };
}

/** One page of search results plus the total count (for pagination). */
export interface SearchResponse { total: number; page: number; pageSize: number; results: Vehicle[] }

/** A customer enquiry captured from any form. status = where it is in the sales pipeline. */
export interface Lead {
  id: number;
  vehicleId: number | null;
  vehicleTitle: string | null;
  type: 'inquiry' | 'test_drive' | 'prequal' | 'trade_in';
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  meta: Record<string, unknown>;
  status: 'new' | 'contacted' | 'won' | 'lost';
  createdAt: string;
}

/** What the pre-qualification endpoint returns. */
export interface PrequalResult {
  approved: boolean;
  tier: string;
  estimatedApr: number;
  maxPayment: number;
  maxAmount: number;
  reference: string;
}

/** Numbers for the dealer dashboard overview tab. */
export interface DealerStats {
  byStatus: { status: VehicleStatus; count: number; value: number }[];
  leads: { type: Lead['type']; count: number }[];
  newLeads: number;
  avgDaysOnLot: number;
  topViewed: Vehicle[];
  byMake: { make: string; count: number }[];
}
