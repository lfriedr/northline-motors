// =============================================================================
// API client — the ONLY place the front end talks to the server.
// Components call e.g. api.search(params) instead of writing fetch() calls
// everywhere, so URLs, headers and error handling live in one spot.
// =============================================================================
import type { DealerStats, Facets, Lead, PrequalResult, SearchResponse, Vehicle } from './types';

/** Thrown when the server responds with an error status (4xx/5xx).
 *  `fields` holds per-field validation messages, e.g. { email: 'Invalid' }. */
export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string> = {}) {
    super(message);
  }
}

// The dealer login token is kept in localStorage so a refresh doesn't log you out.
// try/catch because storage can be blocked (private mode, some embedded browsers).
const TOKEN_KEY = 'nl.dealerToken';
export const dealerToken = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string | null) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

/**
 * Shared fetch wrapper.
 *  - sends/receives JSON
 *  - adds the dealer token when auth = true
 *  - turns non-2xx responses into an ApiError so callers can use try/catch
 * <T> is a TypeScript "generic": the caller says what shape the response has.
 */
async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${dealerToken.get() ?? ''}`;
  const res = await fetch(path, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error || 'Request failed', body.errors);
  return body as T;
}

// Shorthands for building POST / PATCH request options.
const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
const patch = (body: unknown) => ({ method: 'PATCH', body: JSON.stringify(body) });

// One function per endpoint. Each maps 1:1 to a route in server/src/index.js.
export const api = {
  // ---- Public (shoppers) ----
  search: (params: URLSearchParams) => request<SearchResponse>(`/api/vehicles?${params}`),
  facets: () => request<Facets>('/api/facets'),
  vehicle: (id: number | string) => request<{ vehicle: Vehicle; similar: Vehicle[] }>(`/api/vehicles/${id}`),
  byIds: (ids: number[]) => (ids.length ? request<Vehicle[]>(`/api/vehicles-by-ids?ids=${ids.join(',')}`) : Promise.resolve([])),
  createLead: (lead: Partial<Lead> & { vehicleId?: number }) => request<{ id: number }>('/api/leads', post(lead)),
  prequal: (form: Record<string, unknown>) => request<PrequalResult>('/api/prequal', post(form)),

  // ---- Dealer (these send the login token) ----
  dealer: {
    login: (password: string) => request<{ token: string }>('/api/dealer/login', post({ password })),
    vehicles: () => request<Vehicle[]>('/api/dealer/vehicles', {}, true),
    updateVehicle: (id: number, changes: Partial<Vehicle>) => request<Vehicle>(`/api/dealer/vehicles/${id}`, patch(changes), true),
    createVehicle: (v: Record<string, unknown>) => request<Vehicle>('/api/dealer/vehicles', post(v), true),
    leads: () => request<Lead[]>('/api/dealer/leads', {}, true),
    updateLead: (id: number, status: Lead['status']) => request(`/api/dealer/leads/${id}`, patch({ status }), true),
    stats: () => request<DealerStats>('/api/dealer/stats', {}, true),
  },
};
