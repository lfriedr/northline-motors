// SQLite via Node's built-in driver (node:sqlite) — zero native deps.
// The schema is plain SQL, so moving to Postgres / Azure SQL later is a
// matter of swapping this file for a pg / mssql client.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Work out where to store the DB file: server/data/dealer.db by default,
// or wherever the DB_PATH environment variable points.
const here = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(here, '..', 'data', 'dealer.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

// Open (or create) the database file. DatabaseSync = calls run synchronously,
// which is simple and fast for SQLite since the DB is a local file.
export const db = new DatabaseSync(DB_PATH);
// WAL = better performance with concurrent reads; foreign_keys = enforce REFERENCES.
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// Create tables on startup if they don't exist yet ("idempotent" setup).
//
// vehicles: one row per car on the lot.
//   - vin / stock_number are UNIQUE: the DB itself blocks duplicates.
//   - features is a JSON array stored as text (e.g. '["Sunroof","Heated Seats"]').
//   - status CHECK constraint only allows the four known states.
//   - views counts detail-page visits (for "most viewed" analytics).
// leads: every form submission (question, test drive, pre-qual, trade-in).
//   - vehicle_id links to the car; ON DELETE SET NULL keeps the lead if the car is deleted.
//   - meta holds extra JSON (e.g. pre-qual tier/APR).
// Indexes speed up the most common lookups (filter by make/model, sort by price, etc.).
db.exec(`
CREATE TABLE IF NOT EXISTS vehicles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  vin             TEXT NOT NULL UNIQUE,
  stock_number    TEXT NOT NULL UNIQUE,
  year            INTEGER NOT NULL,
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  trim            TEXT,
  body            TEXT NOT NULL,
  drivetrain      TEXT NOT NULL,
  fuel            TEXT NOT NULL,
  transmission    TEXT NOT NULL,
  engine          TEXT,
  mpg_city        INTEGER,
  mpg_hwy         INTEGER,
  mileage         INTEGER NOT NULL,
  price           INTEGER NOT NULL,
  exterior_color  TEXT,
  interior_color  TEXT,
  features        TEXT NOT NULL DEFAULT '[]',
  description     TEXT,
  photo_count     INTEGER NOT NULL DEFAULT 8,
  status          TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available','pending','sold','in_recon')),
  views           INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles(price);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

CREATE TABLE IF NOT EXISTS leads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id  INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('inquiry','test_drive','prequal','trade_in')),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  message     TEXT,
  meta        TEXT NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','won','lost')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
`);

/**
 * Turn a DB row into the JSON shape the client expects.
 * SQL convention is snake_case (stock_number); JavaScript convention is
 * camelCase (stockNumber). Converting in one place keeps both sides tidy.
 * Also parses the features JSON and adds the list of photo URLs.
 */
export function toVehicle(row) {
  if (!row) return null;
  return {
    id: row.id,
    vin: row.vin,
    stockNumber: row.stock_number,
    year: row.year,
    make: row.make,
    model: row.model,
    trim: row.trim,
    body: row.body,
    drivetrain: row.drivetrain,
    fuel: row.fuel,
    transmission: row.transmission,
    engine: row.engine,
    mpgCity: row.mpg_city,
    mpgHwy: row.mpg_hwy,
    mileage: row.mileage,
    price: row.price,
    exteriorColor: row.exterior_color,
    interiorColor: row.interior_color,
    features: JSON.parse(row.features || '[]'),
    description: row.description,
    photoCount: row.photo_count,
    status: row.status,
    views: row.views,
    createdAt: row.created_at,
    photos: Array.from({ length: row.photo_count }, (_, i) => `/api/vehicles/${row.id}/photos/${i + 1}.svg`),
  };
}

/** Same idea for leads. vehicle_title comes from a JOIN in the leads query. */
export function toLead(row) {
  if (!row) return null;
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleTitle: row.vehicle_title ?? null,
    type: row.type,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    meta: JSON.parse(row.meta || '{}'),
    status: row.status,
    createdAt: row.created_at,
  };
}
