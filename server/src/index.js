// =============================================================================
// API server (Node + Express)
//
// This is the REST API the React app talks to. Every endpoint is under /api.
//   Public:  search inventory, vehicle details, photos, submit leads, pre-qualify
//   Dealer:  (requires a login token) manage inventory, leads, and view stats
//
// In production it also serves the built React app (client/dist), so the
// whole thing deploys as ONE service (e.g. Azure App Service, Render, Railway).
// =============================================================================
import express from 'express'; // web framework: routing, JSON parsing, etc.
import cors from 'cors';       // lets the browser call this API from another origin during development
import helmet from 'helmet';   // sets security-related HTTP headers
import rateLimit from 'express-rate-limit'; // limits how many requests one IP can make
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, toVehicle, toLead } from './db.js';
import { seed } from './seed.js';
import { renderPhotoSvg } from './photos.js';
import { getCreditProvider } from './integrations/credit.js';
import { getHistoryProvider } from './integrations/history.js';

// Config comes from environment variables, with safe demo defaults.
const PORT = Number(process.env.PORT || 4000);
// Demo-grade dealer auth. In production use a real identity provider
// (Azure AD B2C, Auth0, Clerk) with role-based access.
const DEALER_TOKEN = process.env.DEALER_TOKEN || 'demo-dealer';

seed(); // first run only — no-op if data exists

const app = express();

// When deployed behind a proxy/load balancer (Heroku, Render, Azure App Service),
// the real visitor IP arrives in the X-Forwarded-For header. Without this setting,
// every visitor would look like the proxy's IP and share ONE rate-limit bucket.
// Set TRUST_PROXY=1 in production; leave it off locally.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

// ---------- Security headers (helmet) ----------
// One line that adds ~a dozen protective headers, including:
//   Content-Security-Policy  – browser only runs scripts/styles from our own site (blocks most XSS)
//   X-Frame-Options          – our pages can't be embedded in another site's iframe (clickjacking)
//   Strict-Transport-Security – browsers must use HTTPS once they've seen the site
//   X-Content-Type-Options   – stops browsers "guessing" file types
// It also removes the X-Powered-By: Express header so we don't advertise our stack.
app.use(helmet());

app.use(cors());                              // allow cross-origin requests
app.use(express.json({ limit: '100kb' }));    // parse JSON request bodies into req.body (with a size cap)

// ---------- Rate limiting ----------
// Each limiter counts requests per IP address within a time window. Once the
// limit is hit, the server answers 429 "Too Many Requests" until the window resets.
// standardHeaders adds RateLimit-* headers so clients can see how many requests remain.
// Note: counts are kept in memory, so they reset on restart and aren't shared
// between multiple server instances. At scale, use a shared store such as Redis.
const limiter = (windowMinutes, limit, error, extra = {}) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error }, // JSON body, so the React app can show it like any other error
    ...extra,           // any per-limiter overrides
  });

// Login: very strict. Stops password-guessing (brute force) attacks.
// skipSuccessfulRequests: only FAILED logins count, so a real dealer who signs
// in several times a day never gets locked out — but 5 wrong guesses do.
const loginLimiter = limiter(15, 5, 'Too many login attempts. Please wait 15 minutes and try again.', { skipSuccessfulRequests: true });
// Form submissions (leads, pre-qual): stops spam and flooding the dealer's lead list.
const formLimiter = limiter(15, 10, 'Too many submissions. Please wait a few minutes and try again.');
// Everything else under /api: generous, just a safety net against scrapers and runaway scripts.
const apiLimiter = limiter(1, 300, 'Too many requests. Please slow down.');

app.use('/api', apiLimiter);

// --- Small helpers for reading query-string values ---
// "12" → 12, "" or missing → undefined
const asInt = (v) => (v === undefined || v === '' ? undefined : Number.parseInt(v, 10));
// "Toyota,Honda" → ['Toyota', 'Honda']
const list = (v) => (v ? String(v).split(',').filter(Boolean) : []);

/**
 * Middleware: runs before protected routes. If the request doesn't carry the
 * right "Authorization: Bearer <token>" header, stop with 401 Unauthorized.
 * Otherwise call next() to continue to the actual route handler.
 */
function requireDealer(req, res, next) {
  if (req.get('authorization') !== `Bearer ${DEALER_TOKEN}`) return res.status(401).json({ error: 'Dealer login required' });
  next();
}

// ---------- Inventory (public) ----------

// Allowed sort options → SQL ORDER BY clause. Using a lookup table (instead of
// putting user input straight into SQL) prevents SQL injection.
const SORTS = {
  newest: 'created_at DESC',
  price_asc: 'price ASC',
  price_desc: 'price DESC',
  miles_asc: 'mileage ASC',
  year_desc: 'year DESC, mileage ASC',
};

/**
 * GET /api/vehicles
 *   q, make (csv), model (csv), body (csv), drivetrain (csv), fuel (csv),
 *   minYear, maxYear, minPrice, maxPrice, maxMiles, sort, page, pageSize
 */
app.get('/api/vehicles', (req, res) => {
  // We build the WHERE clause piece by piece from whichever filters were sent.
  // Values go into `params` and are referenced as @name placeholders — the
  // database driver escapes them safely (parameterized query = no SQL injection).
  const where = ["status IN ('available','pending')"]; // shoppers never see sold / in-recon cars
  const params = {};

  // Multi-select filter, e.g. make=Toyota,Honda → make IN (@make0, @make1)
  const inFilter = (col, key) => {
    const vals = list(req.query[key]);
    if (!vals.length) return;
    where.push(`${col} IN (${vals.map((_, i) => `@${key}${i}`).join(',')})`);
    vals.forEach((v, i) => (params[`${key}${i}`] = v));
  };
  inFilter('make', 'make');
  inFilter('model', 'model');
  inFilter('body', 'body');
  inFilter('drivetrain', 'drivetrain');
  inFilter('fuel', 'fuel');

  // Numeric range filter, e.g. maxPrice=20000 → price <= @maxPrice
  const range = (col, key, op) => {
    const n = asInt(req.query[key]);
    if (Number.isFinite(n)) { where.push(`${col} ${op} @${key}`); params[key] = n; }
  };
  range('year', 'minYear', '>=');
  range('year', 'maxYear', '<=');
  range('price', 'minPrice', '>=');
  range('price', 'maxPrice', '<=');
  range('mileage', 'maxMiles', '<=');

  // Free-text search: glue the searchable fields into one string and LIKE-match it.
  // (Fine for a few hundred cars; for thousands, use SQLite FTS5 or Postgres full-text search.)
  if (req.query.q) {
    where.push("(year || ' ' || make || ' ' || model || ' ' || COALESCE(trim,'') || ' ' || stock_number || ' ' || vin) LIKE @q");
    params.q = `%${String(req.query.q).trim()}%`;
  }

  // Pagination: count all matches (for "27 vehicles match"), then fetch one page.
  const sql = `FROM vehicles WHERE ${where.join(' AND ')}`;
  const pageSize = Math.min(48, asInt(req.query.pageSize) || 12);
  const page = Math.max(1, asInt(req.query.page) || 1);
  const total = db.prepare(`SELECT COUNT(*) AS n ${sql}`).get(params).n;
  const rows = db
    .prepare(`SELECT * ${sql} ORDER BY ${SORTS[req.query.sort] || SORTS.newest} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`)
    .all(params);
  res.json({ total, page, pageSize, results: rows.map(toVehicle) });
});

/** Filter options with counts, for building the search sidebar. */
app.get('/api/facets', (_req, res) => {
  const base = "FROM vehicles WHERE status IN ('available','pending')";
  const facet = (col) => db.prepare(`SELECT ${col} AS value, COUNT(*) AS count ${base} GROUP BY ${col} ORDER BY ${col}`).all();
  const models = db.prepare(`SELECT make, model AS value, COUNT(*) AS count ${base} GROUP BY make, model ORDER BY make, model`).all();
  const bounds = db.prepare(`SELECT MIN(price) minPrice, MAX(price) maxPrice, MIN(year) minYear, MAX(year) maxYear, MAX(mileage) maxMiles ${base}`).get();
  res.json({ make: facet('make'), model: models, body: facet('body'), drivetrain: facet('drivetrain'), fuel: facet('fuel'), bounds });
});

/** One vehicle + its history summary + up to 4 similar cars (same body or make, closest price). */
app.get('/api/vehicles/:id', async (req, res) => {
  const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(asInt(req.params.id));
  if (!row) return res.status(404).json({ error: 'Vehicle not found' });
  // Count the view — feeds "most viewed" in the dealer dashboard.
  db.prepare('UPDATE vehicles SET views = views + 1 WHERE id = ?').run(row.id);
  const vehicle = toVehicle(row);
  vehicle.history = await getHistoryProvider().summary(vehicle);
  const similar = db
    .prepare("SELECT * FROM vehicles WHERE id != ? AND status = 'available' AND (body = ? OR make = ?) ORDER BY ABS(price - ?) LIMIT 4")
    .all(row.id, row.body, row.make, row.price)
    .map(toVehicle);
  res.json({ vehicle, similar });
});

/** Batch lookup for favorites / compare: GET /api/vehicles-by-ids?ids=1,2,3 */
app.get('/api/vehicles-by-ids', (req, res) => {
  const ids = list(req.query.ids).map(Number).filter(Number.isFinite).slice(0, 24);
  if (!ids.length) return res.json([]);
  const rows = db.prepare(`SELECT * FROM vehicles WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  res.json(ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean).map(toVehicle));
});

/** Placeholder photo n for a vehicle. Cached by the browser for a day. */
app.get('/api/vehicles/:id/photos/:n.svg', (req, res) => {
  const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(asInt(req.params.id));
  const n = asInt(req.params.n);
  if (!row || !(n >= 1 && n <= row.photo_count)) return res.status(404).end();
  res.type('image/svg+xml').set('Cache-Control', 'public, max-age=86400').send(renderPhotoSvg(row, n));
});

// ---------- Leads & financing (public) ----------

// Simple "something@something.something" check. Good enough for a lead form.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lead capture: "Ask a question", "Book test drive", trade-in requests.
 * Always validate on the server, even if the browser validated too —
 * anyone can send a request directly without using the UI.
 * Responds 422 with { errors: { field: message } } so the form can show them.
 * formLimiter runs first (Express calls middleware left to right) and rejects
 * the request with 429 if this IP has submitted too many times.
 */
app.post('/api/leads', formLimiter, (req, res) => {
  const { vehicleId, type = 'inquiry', name, email, phone, message, meta } = req.body || {};
  const errors = {};
  if (!name || String(name).trim().length < 2) errors.name = 'Please enter your name';
  if (!email || !EMAIL_RE.test(email)) errors.email = 'Please enter a valid email';
  if (!['inquiry', 'test_drive', 'trade_in'].includes(type)) errors.type = 'Invalid lead type';
  if (Object.keys(errors).length) return res.status(422).json({ errors });
  const info = db
    .prepare('INSERT INTO leads (vehicle_id, type, name, email, phone, message, meta) VALUES (?,?,?,?,?,?,?)')
    .run(vehicleId ?? null, type, String(name).trim(), email, phone || null, message || null, JSON.stringify(meta || {}));
  // Hook point: notify the dealer (Twilio SMS / email) and push to the CRM here.
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

/**
 * Pre-qualification: validate → ask the credit provider adapter for an
 * estimate → save the outcome as a lead → return the estimate to the shopper.
 */
app.post('/api/prequal', formLimiter, async (req, res) => {
  const b = req.body || {};
  const errors = {};
  if (!b.firstName) errors.firstName = 'Required';
  if (!b.lastName) errors.lastName = 'Required';
  if (!b.email || !EMAIL_RE.test(b.email)) errors.email = 'Valid email required';
  if (!(Number(b.monthlyIncome) > 0)) errors.monthlyIncome = 'Enter your monthly income';
  if (!['excellent', 'good', 'fair', 'poor'].includes(b.creditBand)) errors.creditBand = 'Choose a range';
  if (!b.consent) errors.consent = 'Consent is required to continue';
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  const result = await getCreditProvider().prequalify({
    creditBand: b.creditBand,
    monthlyIncome: Number(b.monthlyIncome),
    monthlyHousing: Number(b.monthlyHousing) || 0,
  });
  // Store the outcome, never sensitive identifiers. (A real hard-pull app would
  // send SSN/DOB straight to the lender over TLS and not persist it here.)
  db.prepare('INSERT INTO leads (vehicle_id, type, name, email, phone, meta) VALUES (?,?,?,?,?,?)').run(
    b.vehicleId ?? null, 'prequal', `${b.firstName} ${b.lastName}`, b.email, b.phone || null,
    JSON.stringify({ tier: result.tier, estimatedApr: result.estimatedApr, maxAmount: result.maxAmount, reference: result.reference }),
  );
  res.json(result);
});

// ---------- Dealer (protected) ----------
// Every route below except /login passes through requireDealer first.

/** Exchange the password for a token the client stores and sends back. */
app.post('/api/dealer/login', loginLimiter, (req, res) => {
  if (req.body?.password === (process.env.DEALER_PASSWORD || 'demo')) return res.json({ token: DEALER_TOKEN });
  res.status(401).json({ error: 'Wrong password (hint: demo)' });
});

app.get('/api/dealer/vehicles', requireDealer, (req, res) => {
  const status = req.query.status;
  const rows = status
    ? db.prepare('SELECT * FROM vehicles WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM vehicles ORDER BY created_at DESC').all();
  res.json(rows.map(toVehicle));
});

// Allow-list of fields the dealer may edit: client field name → DB column.
// Anything not listed here is ignored, so a request can't overwrite e.g. the VIN or id.
const EDITABLE = {
  price: 'price', mileage: 'mileage', status: 'status', trim: 'trim', exteriorColor: 'exterior_color',
  interiorColor: 'interior_color', description: 'description',
};

/** Partial update (PATCH = change only the fields sent). Used for inline price/status edits. */
app.patch('/api/dealer/vehicles/:id', requireDealer, (req, res) => {
  const sets = [];
  const params = { id: asInt(req.params.id) };
  for (const [key, col] of Object.entries(EDITABLE)) {
    if (req.body[key] !== undefined) { sets.push(`${col} = @${col}`); params[col] = req.body[key]; }
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  try {
    db.prepare(`UPDATE vehicles SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(params);
  } catch (e) {
    return res.status(422).json({ error: e.message });
  }
  res.json(toVehicle(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(params.id)));
});

/** Add a vehicle. New units start as 'in_recon' (being reconditioned) so they aren't public yet. */
app.post('/api/dealer/vehicles', requireDealer, (req, res) => {
  const v = req.body || {};
  const required = ['vin', 'year', 'make', 'model', 'body', 'price', 'mileage'];
  const missing = required.filter((k) => v[k] === undefined || v[k] === '');
  if (missing.length) return res.status(422).json({ error: `Missing: ${missing.join(', ')}` });
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(v.vin)) return res.status(422).json({ error: 'VIN must be 17 characters (no I, O, Q)' });
  const stock = 'NL' + (24100 + db.prepare('SELECT COUNT(*) n FROM vehicles').get().n);
  try {
    const info = db.prepare(`INSERT INTO vehicles (vin, stock_number, year, make, model, trim, body, drivetrain, fuel, transmission, engine, mileage, price, exterior_color, interior_color, description, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'in_recon')`).run(
      v.vin.toUpperCase(), stock, Number(v.year), v.make, v.model, v.trim || null, v.body, v.drivetrain || 'FWD', v.fuel || 'Gas',
      v.transmission || 'Automatic', v.engine || null, Number(v.mileage), Number(v.price), v.exteriorColor || 'Gray', v.interiorColor || 'Black', v.description || null,
    );
    res.status(201).json(toVehicle(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(info.lastInsertRowid)));
  } catch (e) {
    res.status(422).json({ error: e.message.includes('UNIQUE') ? 'A vehicle with that VIN already exists' : e.message });
  }
});

/** All leads, newest first, joined with the vehicle they're about (LEFT JOIN = keep leads with no vehicle). */
app.get('/api/dealer/leads', requireDealer, (_req, res) => {
  const rows = db.prepare(`SELECT l.*, (v.year || ' ' || v.make || ' ' || v.model) AS vehicle_title
    FROM leads l LEFT JOIN vehicles v ON v.id = l.vehicle_id ORDER BY l.created_at DESC LIMIT 200`).all();
  res.json(rows.map(toLead));
});

app.patch('/api/dealer/leads/:id', requireDealer, (req, res) => {
  if (!['new', 'contacted', 'won', 'lost'].includes(req.body?.status)) return res.status(422).json({ error: 'Invalid status' });
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(req.body.status, asInt(req.params.id));
  res.json({ ok: true });
});

/** Numbers for the dashboard overview. Each is one small aggregate SQL query. */
app.get('/api/dealer/stats', requireDealer, (_req, res) => {
  const byStatus = db.prepare('SELECT status, COUNT(*) AS count, SUM(price) AS value FROM vehicles GROUP BY status').all();
  const leads = db.prepare('SELECT type, COUNT(*) AS count FROM leads GROUP BY type').all();
  const newLeads = db.prepare("SELECT COUNT(*) n FROM leads WHERE status = 'new'").get().n;
  const avgDays = db.prepare("SELECT ROUND(AVG(julianday('now') - julianday(created_at)), 1) AS d FROM vehicles WHERE status = 'available'").get().d;
  const topViewed = db.prepare("SELECT * FROM vehicles WHERE status = 'available' ORDER BY views DESC LIMIT 5").all().map(toVehicle);
  const byMake = db.prepare("SELECT make, COUNT(*) AS count FROM vehicles WHERE status IN ('available','pending') GROUP BY make ORDER BY count DESC LIMIT 8").all();
  res.json({ byStatus, leads, newLeads, avgDaysOnLot: avgDays, topViewed, byMake });
});

// ---------- Static client (production) ----------
// After `npm run build`, serve the React files. Any non-/api URL returns
// index.html so React Router can handle routes like /vehicles/12 on refresh.
const dist = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

// Last-resort error handler: log details on the server, send a generic message
// to the client (never leak stack traces to users).
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
