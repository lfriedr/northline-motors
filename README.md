# Northline Motors — online car-buying platform (portfolio demo)

A full-stack demo of a modern used-car dealership website, from browsing to financing, built to show the kind of work in "online vehicle purchasing platform" job posts.

> **Demo only.** Northline Motors is fictional. All vehicles, VINs, photos and credit decisions are simulated. No real credit checks or payments happen.

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS · Node.js + Express · SQL (SQLite via Node's built-in driver) · REST API · Vitest

---

## What's built

**Shoppers**
- Inventory search with filters for make, model, body style, price, year, mileage, drivetrain and fuel; sorting; pagination. All filter state is in the URL, so searches are shareable and indexable.
- Vehicle detail page: swipeable photo gallery (with full-screen view and keyboard support), specs, vehicle-history summary, features, similar vehicles
- Payment calculator: down payment, term, APR by credit tier, trade-in value and payoff (with negative equity), sales tax and fees. The math is unit-tested.
- 3-step pre-qualification flow with validation and a consent step
- Save favorites ♥ and compare up to 3 vehicles side by side
- Lead capture: "Ask a question" / "Book a test drive"
- Mobile-first layout, accessible labels, and schema.org `Car` structured data for SEO

**Dealer dashboard** (`/dealer`, password `demo`)
- KPIs: available units, inventory value, average days on lot, new leads
- Most-viewed listings and inventory-by-make chart
- Inventory table: edit prices inline and change status (Available / Pending / Sold / In reconditioning)
- Leads pipeline: new → contacted → won / lost
- Add a vehicle by VIN

**Integration-ready design**
Third-party services sit behind adapters (`server/src/integrations/`). Providers like 700Credit, RouteOne, Dealertrack and Carfax require dealer credentials, so the demo uses mocks with the same interface. A real provider plugs in without changing the rest of the app.

---

## Run it

Requires **Node 22.13+** (for the built-in `node:sqlite`).

```bash
npm install        # installs server + client (npm workspaces)
npm run dev        # API on :4000, React app on http://localhost:5173
```

On first start, the database is created and seeded with 72 vehicles.

| Command | What it does |
|---|---|
| `npm run dev` | Runs the API and React dev server together, with live reload |
| `npm test` | Runs the payment-math unit tests |
| `npm run seed` | Wipes the database and reseeds demo data |
| `npm run build` then `npm start` | Production build; the API serves the React app on :4000 |

Copy `.env.example` to `.env` to change the port, dealer password and so on.

---

## Project tour

```
server/src/
  index.js              ← every REST endpoint (start reading here)
  db.js                 ← database connection + table definitions
  seed.js               ← generates realistic demo inventory
  photos.js             ← placeholder car images (SVG)
  integrations/
    credit.js           ← pre-qualification adapter (mock → 700Credit/RouteOne)
    history.js          ← vehicle history adapter (mock → Carfax/AutoCheck)

client/src/
  main.tsx              ← entry point
  App.tsx               ← URL → page mapping
  api.ts                ← all calls to the server
  types.ts              ← shapes of the API's JSON
  lib/payment.ts        ← loan math (+ payment.test.ts)
  state/garage.tsx      ← favorites + compare (shared state)
  components/           ← reusable pieces (cards, filters, gallery, calculator…)
  pages/                ← one file per page
```

Every file has comments explaining what it does and why.

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/vehicles?make=Toyota,Honda&maxPrice=25000&sort=price_asc&page=1` | Search inventory |
| GET | `/api/facets` | Filter options with counts |
| GET | `/api/vehicles/:id` | One vehicle + history + similar vehicles |
| GET | `/api/vehicles-by-ids?ids=1,2,3` | Batch lookup (favorites/compare) |
| POST | `/api/leads` | Submit an inquiry / test-drive request |
| POST | `/api/prequal` | Pre-qualification estimate |
| POST | `/api/dealer/login` | Get a dealer token |
| GET/PATCH/POST | `/api/dealer/vehicles…` | Manage inventory 🔒 |
| GET/PATCH | `/api/dealer/leads…` | Manage leads 🔒 |
| GET | `/api/dealer/stats` | Dashboard numbers 🔒 |

---

## Roadmap (next features to build)

1. **Checkout:** Stripe test-mode deposit to reserve a car (Stripe Checkout + a webhook that sets status to `pending`)
2. **E-signature:** DocuSign developer sandbox (free) to send a buyer's order for signing
3. **Delivery scheduling:** date/time-slot picker that saves to an `appointments` table
4. **SMS lead alerts:** Twilio trial account, triggered in `POST /api/leads`
5. **VIN decode:** autofill Add Vehicle from NHTSA's free vPIC API
6. **Customer accounts:** sign in, saved cars synced to the server, application status
7. **Real photos:** upload to Azure Blob Storage or S3 and serve through a CDN
8. **Swap SQLite → Postgres / Azure SQL:** the SQL is standard, so only `db.js` changes
9. **Server-side rendering for SEO:** move pages to Next.js or React Router framework mode

## Security

- **Security headers (helmet):** a Content-Security-Policy that only allows scripts from this site, clickjacking protection (frame-ancestors / X-Frame-Options), HSTS, and no `X-Powered-By` header.
- **CORS restricted:** browsers only let your own site (plus any origins in `CORS_ORIGINS`) call the API. Other websites' requests are blocked at the preflight check and never reach the server.
- **Rate limiting (express-rate-limit):** each limit is per IP and returns `429 Too Many Requests` with a message the UI displays.

  | Endpoint | Limit | Why |
  |---|---|---|
  | `POST /api/dealer/login` | 5 **failed** attempts / 15 min | Blocks password guessing; successful logins don't count |
  | `POST /api/leads`, `POST /api/prequal` | 10 / 15 min | Stops form spam flooding the dealer's lead list |
  | Everything under `/api` | 300 / min | Safety net against scrapers and runaway scripts |

  Set `TRUST_PROXY=1` when deployed behind a proxy so limits use the visitor's real IP. Counts are kept in memory; with multiple server instances, use a shared store such as Redis.

## Production notes

- **Auth:** the dealer login is demo-grade (one shared token). Use a real identity provider (Azure AD B2C, Auth0, Clerk) with roles.
- **Sensitive data:** the pre-qual form deliberately doesn't collect SSN or date of birth. A real hard-pull application should send those straight to the lender over TLS and never store them. Credit pulls also need FCRA-compliant consent wording from the lender.
- **Validation** happens on both client and server. SQL uses parameterized queries, and editable fields are allow-listed.
