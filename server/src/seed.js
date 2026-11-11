// Seeds ~72 realistic used vehicles. Deterministic (seeded PRNG) so the demo
// looks the same every time. VINs are synthetic but pass the check-digit test.
// Run:  npm run seed
import { db } from './db.js';

// --- Random helpers ---
// A tiny "linear congruential" random generator with a fixed starting seed.
// Unlike Math.random(), it produces the same sequence every run, so the
// demo inventory is identical each time you reseed.
let s = 20261111;
const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); // 0..1
const pick = (arr) => arr[Math.floor(rand() * arr.length)];                       // random array item
const between = (a, b) => Math.round(a + rand() * (b - a));                        // random int in [a, b]

// The models we stock. Each entry is:
// make, model, body, base MSRP (newest-year, base trim), trims, engines, drivetrains, fuel, mpg [city, hwy]
const CATALOG = [
  ['Toyota', 'Camry', 'Sedan', 28000, ['LE', 'SE', 'XSE', 'XLE'], ['2.5L I4'], ['FWD'], 'Gas', [28, 39]],
  ['Toyota', 'Corolla', 'Sedan', 22500, ['L', 'LE', 'SE'], ['2.0L I4'], ['FWD'], 'Gas', [32, 41]],
  ['Toyota', 'RAV4', 'SUV', 30000, ['LE', 'XLE', 'Adventure', 'Limited'], ['2.5L I4'], ['FWD', 'AWD'], 'Gas', [27, 34]],
  ['Toyota', 'RAV4 Hybrid', 'SUV', 33000, ['XLE', 'XSE', 'Limited'], ['2.5L I4 Hybrid'], ['AWD'], 'Hybrid', [41, 38]],
  ['Toyota', 'Tacoma', 'Truck', 33000, ['SR5', 'TRD Sport', 'TRD Off-Road'], ['3.5L V6'], ['RWD', '4WD'], 'Gas', [19, 24]],
  ['Toyota', 'Highlander', 'SUV', 39500, ['LE', 'XLE', 'Limited'], ['3.5L V6', '2.4L I4 Turbo'], ['FWD', 'AWD'], 'Gas', [21, 28]],
  ['Honda', 'Civic', 'Sedan', 24500, ['LX', 'Sport', 'EX', 'Touring'], ['2.0L I4', '1.5L I4 Turbo'], ['FWD'], 'Gas', [31, 40]],
  ['Honda', 'Accord', 'Sedan', 29000, ['LX', 'Sport', 'EX-L'], ['1.5L I4 Turbo'], ['FWD'], 'Gas', [29, 37]],
  ['Honda', 'CR-V', 'SUV', 31000, ['LX', 'EX', 'EX-L', 'Touring'], ['1.5L I4 Turbo'], ['FWD', 'AWD'], 'Gas', [28, 34]],
  ['Honda', 'Pilot', 'SUV', 40000, ['Sport', 'EX-L', 'Touring'], ['3.5L V6'], ['FWD', 'AWD'], 'Gas', [19, 25]],
  ['Ford', 'F-150', 'Truck', 38000, ['XL', 'XLT', 'Lariat'], ['2.7L V6 EcoBoost', '3.5L V6 EcoBoost', '5.0L V8'], ['RWD', '4WD'], 'Gas', [18, 24]],
  ['Ford', 'Escape', 'SUV', 29000, ['S', 'SE', 'Titanium'], ['1.5L I3 Turbo', '2.0L I4 Turbo'], ['FWD', 'AWD'], 'Gas', [27, 33]],
  ['Ford', 'Explorer', 'SUV', 39000, ['XLT', 'Limited', 'ST'], ['2.3L I4 Turbo', '3.0L V6 Turbo'], ['RWD', '4WD'], 'Gas', [21, 28]],
  ['Ford', 'Mustang', 'Coupe', 32000, ['EcoBoost', 'GT'], ['2.3L I4 Turbo', '5.0L V8'], ['RWD'], 'Gas', [21, 30]],
  ['Chevrolet', 'Silverado 1500', 'Truck', 38500, ['WT', 'LT', 'RST', 'LTZ'], ['2.7L I4 Turbo', '5.3L V8'], ['RWD', '4WD'], 'Gas', [17, 22]],
  ['Chevrolet', 'Equinox', 'SUV', 28000, ['LS', 'LT', 'Premier'], ['1.5L I4 Turbo'], ['FWD', 'AWD'], 'Gas', [26, 31]],
  ['Chevrolet', 'Malibu', 'Sedan', 25000, ['LS', 'LT', 'Premier'], ['1.5L I4 Turbo'], ['FWD'], 'Gas', [29, 36]],
  ['Chevrolet', 'Tahoe', 'SUV', 56000, ['LS', 'LT', 'Z71', 'Premier'], ['5.3L V8'], ['RWD', '4WD'], 'Gas', [15, 20]],
  ['Nissan', 'Altima', 'Sedan', 26000, ['S', 'SV', 'SR'], ['2.5L I4'], ['FWD', 'AWD'], 'Gas', [27, 37]],
  ['Nissan', 'Rogue', 'SUV', 29000, ['S', 'SV', 'SL'], ['1.5L I3 Turbo'], ['FWD', 'AWD'], 'Gas', [30, 37]],
  ['Jeep', 'Wrangler', 'SUV', 34000, ['Sport', 'Sahara', 'Rubicon'], ['3.6L V6', '2.0L I4 Turbo'], ['4WD'], 'Gas', [17, 23]],
  ['Jeep', 'Grand Cherokee', 'SUV', 40000, ['Laredo', 'Limited', 'Overland'], ['3.6L V6'], ['RWD', '4WD'], 'Gas', [19, 26]],
  ['Hyundai', 'Elantra', 'Sedan', 22000, ['SE', 'SEL', 'Limited'], ['2.0L I4'], ['FWD'], 'Gas', [33, 42]],
  ['Hyundai', 'Tucson', 'SUV', 29000, ['SE', 'SEL', 'Limited'], ['2.5L I4'], ['FWD', 'AWD'], 'Gas', [25, 32]],
  ['Kia', 'Telluride', 'SUV', 37000, ['LX', 'S', 'EX', 'SX'], ['3.8L V6'], ['FWD', 'AWD'], 'Gas', [20, 26]],
  ['Subaru', 'Outback', 'Wagon', 30000, ['Base', 'Premium', 'Limited', 'Onyx'], ['2.5L H4'], ['AWD'], 'Gas', [26, 32]],
  ['Subaru', 'Forester', 'SUV', 29000, ['Base', 'Premium', 'Sport', 'Limited'], ['2.5L H4'], ['AWD'], 'Gas', [26, 33]],
  ['Mazda', 'CX-5', 'SUV', 30000, ['S Select', 'S Preferred', 'Carbon Edition'], ['2.5L I4'], ['AWD'], 'Gas', [24, 30]],
  ['Ram', '1500', 'Truck', 41000, ['Tradesman', 'Big Horn', 'Laramie'], ['3.6L V6', '5.7L V8'], ['RWD', '4WD'], 'Gas', [17, 23]],
  ['Tesla', 'Model 3', 'Sedan', 40000, ['RWD', 'Long Range'], ['Electric'], ['RWD', 'AWD'], 'Electric', [134, 126]],
  ['Tesla', 'Model Y', 'SUV', 45000, ['Long Range', 'Performance'], ['Electric'], ['AWD'], 'Electric', [127, 117]],
  ['BMW', '3 Series', 'Sedan', 45000, ['330i', '330i xDrive', 'M340i'], ['2.0L I4 Turbo', '3.0L I6 Turbo'], ['RWD', 'AWD'], 'Gas', [26, 36]],
];

const COLORS_EXT = ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green', 'Pearl White', 'Charcoal', 'Navy'];
const COLORS_INT = ['Black', 'Gray', 'Beige', 'Brown'];
const FEATURE_POOL = [
  'Backup Camera', 'Bluetooth', 'Apple CarPlay', 'Android Auto', 'Blind Spot Monitoring',
  'Adaptive Cruise Control', 'Lane Keep Assist', 'Heated Seats', 'Leather Seats', 'Sunroof',
  'Navigation', 'Remote Start', 'Keyless Entry', 'Power Liftgate', 'Third-Row Seating',
  'Tow Package', 'Premium Audio', 'Wireless Charging', 'Ventilated Seats', '360° Camera',
];

// --- Synthetic VIN with a valid check digit (position 9) ---
// Real VINs are 17 characters. Character 9 is a "check digit" computed from the
// others (letters → numbers via TRANSLIT, multiplied by WEIGHTS, sum mod 11),
// and character 10 encodes the model year. Our fake VINs follow those rules
// so a VIN validator will accept them, but they don't belong to real cars.
const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'; // no I, O, Q
const TRANSLIT = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const YEAR_CODE = { 2016: 'G', 2017: 'H', 2018: 'J', 2019: 'K', 2020: 'L', 2021: 'M', 2022: 'N', 2023: 'P', 2024: 'R', 2025: 'S' };
function makeVin(year) {
  const chars = Array.from({ length: 17 }, () => pick(VIN_CHARS));
  chars[9] = YEAR_CODE[year] || 'S';
  for (let i = 11; i < 17; i++) chars[i] = String(between(0, 9));
  const sum = chars.reduce((acc, c, i) => acc + (/\d/.test(c) ? Number(c) : TRANSLIT[c]) * WEIGHTS[i], 0);
  const r = sum % 11;
  chars[8] = r === 10 ? 'X' : String(r);
  return chars.join('');
}

/** Creates one realistic-looking used car (as a DB row object). `i` makes the stock number unique. */
function buildVehicle(i) {
  const [make, model, body, msrp, trims, engines, drivetrains, fuel, mpg] = pick(CATALOG);
  const year = between(2017, 2025);
  const age = 2026 - year;
  const trimIdx = Math.floor(rand() * trims.length);
  const mileage = Math.max(3200, Math.round((age * between(9500, 14500) + between(-4000, 4000)) / 100) * 100);
  // rough depreciation curve + trim premium + mileage adjustment
  const trimPremium = 1 + trimIdx * 0.08;
  const depreciation = Math.pow(0.86, age);
  const mileageAdj = 1 - Math.min(0.18, Math.max(0, (mileage - age * 12000) / 400000));
  const raw = msrp * trimPremium * depreciation * mileageAdj * (0.95 + rand() * 0.1);
  const price = Math.max(8995, Math.round(raw / 500) * 500 - 5);
  // Only give features that make sense for the vehicle (no third row on a Civic).
  // Higher trims get more features.
  const THREE_ROW =['Highlander', 'Pilot', 'Explorer', 'Tahoe', 'Telluride'];
  const fits = (f) =>
    (f !== 'Third-Row Seating' || THREE_ROW.includes(model)) &&
    (f !== 'Power Liftgate' || body === 'SUV' || body === 'Wagon') &&
    (f !== 'Tow Package' || body === 'Truck' || body === 'SUV');
  const features = ['Backup Camera', 'Bluetooth', ...FEATURE_POOL.filter((f) => fits(f) && rand() < 0.3 + trimIdx * 0.1)];
  if (body === 'Truck') features.push('Tow Package');
  // Most cars are available; a few are pending, sold, or still in reconditioning.
  const statusRoll = rand();
  const status = statusRoll < 0.08 ? 'pending' : statusRoll < 0.12 ? 'sold' : statusRoll < 0.15 ? 'in_recon' : 'available';
  const exterior = pick(COLORS_EXT);
  return {
    vin: makeVin(year),
    stock_number: `NL${String(24100 + i)}`,
    year, make, model,
    trim: trims[trimIdx],
    body,
    drivetrain: pick(drivetrains),
    fuel,
    transmission: fuel === 'Electric' ? 'Single-Speed' : rand() < 0.12 && body === 'Coupe' ? 'Manual' : 'Automatic',
    engine: pick(engines),
    mpg_city: mpg[0],
    mpg_hwy: mpg[1],
    mileage,
    price,
    exterior_color: exterior,
    interior_color: pick(COLORS_INT),
    features: JSON.stringify([...new Set(features)]),
    description: `This ${year} ${make} ${model} ${trims[trimIdx]} in ${exterior} has ${mileage.toLocaleString()} miles and has passed our 150-point inspection. One-owner, clean title, and ready for home delivery.`,
    photo_count: between(6, 10),
    status,
    views: between(12, 640),
    created_at: new Date(Date.UTC(2026, 9, 1) + between(0, 40) * 86400000).toISOString().replace('T', ' ').slice(0, 19),
  };
}

/**
 * Fill the database with demo data.
 * Called automatically on server start (does nothing if data exists), or
 * with force:true from `npm run seed` to wipe and start fresh.
 */
export function seed({ count = 72, force = false } = {}) {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM vehicles').get().n;
  if (existing > 0 && !force) return existing;
  // Wipe old data (sqlite_sequence resets the auto-increment ids back to 1).
  db.exec('DELETE FROM leads; DELETE FROM vehicles; DELETE FROM sqlite_sequence;');
  // Build the INSERT statement from the object's keys so columns and values always line up.
  const cols = Object.keys(buildVehicle(0));
  s = 20261111; // reset so output is deterministic
  const insert = db.prepare(`INSERT INTO vehicles (${cols.join(',')}) VALUES (${cols.map((c) => '@' + c).join(',')})`);
  // A transaction makes the 72 inserts all-or-nothing, and much faster than one at a time.
  db.exec('BEGIN');
  for (let i = 0; i < count; i++) insert.run(buildVehicle(i));
  // a few sample leads so the dashboard isn't empty
  const leadInsert = db.prepare('INSERT INTO leads (vehicle_id, type, name, email, phone, message, status, created_at) VALUES (?,?,?,?,?,?,?,?)');
  const sample = [
    [3, 'test_drive', 'Jordan Reyes', 'jordan@example.com', '555-0142', 'Is Saturday morning open?', 'new'],
    [11, 'inquiry', 'Priya Natarajan', 'priya@example.com', '555-0177', 'Any accident history?', 'contacted'],
    [7, 'prequal', 'Marcus Lee', 'marcus@example.com', '555-0119', null, 'new'],
    [22, 'inquiry', 'Dana Whitfield', 'dana@example.com', null, 'Can you deliver to Ann Arbor?', 'won'],
    [5, 'trade_in', 'Sam Ortiz', 'sam@example.com', '555-0190', '2015 Civic, 98k miles', 'new'],
  ];
  sample.forEach((l, i) => leadInsert.run(...l, new Date(Date.UTC(2026, 10, 3 + i, 15)).toISOString().replace('T', ' ').slice(0, 19)));
  db.exec('COMMIT');
  return count;
}

// Only runs when this file is executed directly (`node src/seed.js`),
// not when it's imported by index.js.
if (import.meta.url === `file://${process.argv[1]}`) {
  const n = seed({ force: true });
  console.log(`Seeded ${n} vehicles.`);
}
