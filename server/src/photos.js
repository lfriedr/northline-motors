// Placeholder vehicle photos rendered as SVG, so the demo works with no image
// hosting. Replace with real photos (Azure Blob Storage / S3 + CDN) for production.

// Color name (as stored in the DB) → hex value used to paint the silhouette.
const HEX = {
  Black: '#1f2328', White: '#f4f5f7', Silver: '#b9bec6', Gray: '#7a818c', Blue: '#2f5fa8',
  Red: '#b3262e', Green: '#2f6b4f', 'Pearl White': '#ece8df', Charcoal: '#3d4249', Navy: '#1f2f55',
};

// Side-profile silhouettes (viewBox 0 0 400 160), wheels drawn separately.
const SHAPES = {
  Sedan: 'M30 112 L48 86 Q60 78 90 76 L140 74 L175 50 Q190 42 215 42 L262 43 Q282 44 298 58 L322 78 Q360 82 372 94 L376 112 Z',
  Coupe: 'M30 112 L46 88 Q60 80 92 78 L150 74 L190 50 Q205 44 228 45 L262 48 Q282 52 300 70 L326 82 Q362 86 372 98 L374 112 Z',
  SUV: 'M28 114 L32 82 Q36 72 60 70 L100 68 L128 38 Q136 30 156 30 L300 30 Q318 30 326 42 L346 70 Q368 74 372 88 L374 114 Z',
  Wagon: 'M28 114 L36 86 Q44 76 72 74 L118 72 L150 44 Q160 36 180 36 L318 38 Q334 40 340 54 L350 74 Q368 78 372 92 L374 114 Z',
  Truck: 'M24 114 L26 80 Q28 72 44 72 L190 72 L190 40 Q190 32 200 32 L270 32 Q286 32 296 46 L316 72 Q362 74 372 86 L376 114 Z',
};

// Window ("greenhouse") shapes that sit inside each silhouette's roofline.
const WINDOWS = {
  Sedan: 'M180 56 Q192 50 214 50 L258 51 Q276 52 290 64 L300 74 L162 75 Z',
  Coupe: 'M196 56 Q208 52 228 52 L260 55 Q278 59 292 72 L298 78 L172 77 Z',
  SUV: 'M138 44 Q144 38 160 38 L296 38 Q310 38 318 48 L332 68 L122 69 Z',
  Wagon: 'M158 48 Q166 43 184 43 L314 45 Q326 47 330 57 L336 72 L132 72 Z',
  Truck: 'M200 40 L268 40 Q282 40 290 50 L304 70 L200 70 Z',
};

// Labels cycled through for photo 1, 2, 3… to mimic a real listing's shot list.
const ANGLES = ['Exterior · Driver side', 'Front ¾', 'Rear ¾', 'Interior · Dash', 'Interior · Rear seats', 'Wheels', 'Cargo area', 'Engine bay', 'Exterior · Passenger side', 'Odometer'];

/**
 * Builds an SVG image (as a string) for photo number `n` of a vehicle.
 * @param vehicle  a raw DB row (snake_case fields)
 * @param n        1-based photo number
 */
export function renderPhotoSvg(vehicle, n) {
  const color = HEX[vehicle.exterior_color] || '#7a818c'; // paint color
  const shape = SHAPES[vehicle.body] || SHAPES.Sedan;     // body silhouette
  const flip = n % 2 === 0;                               // mirror every other photo for variety
  const bgA = ['#e8edf3', '#efe9e1', '#e3ebe6', '#ece7f0'][n % 4]; // rotate background tints
  const label = ANGLES[(n - 1) % ANGLES.length];
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  // The SVG layers, back to front: background gradient → floor → shadow →
  // car body (scaled 1.9× and centered) → windows → wheels → caption box.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${title} – ${label} (placeholder)">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="#cfd6de"/></linearGradient>
    <linearGradient id="paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.85"/><stop offset="1" stop-color="${color}"/></linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect y="430" width="800" height="170" fill="#b8c0c9" opacity="0.55"/>
  <ellipse cx="400" cy="452" rx="300" ry="18" fill="#000" opacity="0.18"/>
  <g transform="translate(400 330) scale(${flip ? -1.9 : 1.9} 1.9) translate(-200 -80)">
    <path d="${shape}" fill="url(#paint)" stroke="#0b0d10" stroke-opacity="0.35" stroke-width="1.5"/>
    <path d="${WINDOWS[vehicle.body] || WINDOWS.Sedan}" fill="#0f1720" opacity="0.6"/>
    <g fill="#16191d"><circle cx="100" cy="114" r="22"/><circle cx="306" cy="114" r="22"/></g>
    <g fill="#9aa3ad"><circle cx="100" cy="114" r="10"/><circle cx="306" cy="114" r="10"/></g>
  </g>
  <g font-family="system-ui, -apple-system, Segoe UI, sans-serif">
    <rect x="24" y="24" rx="8" width="${Math.max(220, title.length * 11 + 40)}" height="64" fill="#0b1b2b" opacity="0.82"/>
    <text x="44" y="52" font-size="20" font-weight="700" fill="#fff">${title}</text>
    <text x="44" y="76" font-size="14" fill="#c8d3df">${label}</text>
    <text x="776" y="580" font-size="13" fill="#3b4652" text-anchor="end">Placeholder photo ${n} of ${vehicle.photo_count} · demo only</text>
  </g>
</svg>`;
}
