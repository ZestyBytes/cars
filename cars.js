/* ------------------------------------------------------------------
   cars.js — car silhouettes used for the big buttons.
   Every shape draws in a 0 0 120 48 viewBox with the nose pointing
   right, wheels on a ground line at y=46, and fills with currentColor so the
   panel tint carries through.
   ------------------------------------------------------------------ */

const WHEEL_HUB = 'rgba(0,0,0,.45)';

/* Wheels always sit on the same ground line (y=46) whatever their size,
   so a tractor and a hatchback line up next to each other. */
function wheels(positions, r = 7) {
  const cy = 46 - r;
  return positions
    .map(
      (x) =>
        `<circle cx="${x}" cy="${cy}" r="${r}" fill="currentColor"/>` +
        `<circle cx="${x}" cy="${cy}" r="${r * 0.42}" fill="${WHEEL_HUB}"/>`
    )
    .join('');
}

const CAR_SHAPES = {
  ev: {
    /* Long, low, one unbroken fastback curve — reads "Tesla" next to the stubby hatch. */
    label: 'Electric / saloon',
    svg:
      `<path d="M3 39 L3 31 C3 28 6 26 11 25 L28 23 L48 12 C54 9 60 8 68 8 L80 8 C88 8 95 10 101 14 L113 23 C116 24 118 27 118 31 L118 39 Z" fill="currentColor"/>` +
      `<path d="M33 23 L50 13.5 C54 11.5 58 10.5 63 10.5 L66 22 L33 22.6 Z M72 10.5 L80 10.5 C86 10.5 92 12 96 15 L106 22 L72 22 Z" fill="rgba(0,0,0,.3)"/>` +
      wheels([30, 96]),
  },
  hatch: {
    /* Short body, tall glasshouse, near-vertical tailgate — a Jazz, a Fiesta, a Mini. */
    label: 'Small hatchback',
    svg:
      `<path d="M20 39 L20 19 C20 12 25 7 34 5 L62 3 C73 3 81 6 87 12 L94 19 L99 20 C103 21 105 23 105 27 L105 39 Z" fill="currentColor"/>` +
      `<path d="M27 17 C27 12 30 9 36 8 L54 6.5 L54 18 L27 18 Z M60 6.5 L66 6.5 C74 6.5 80 9 84 14 L88 18 L60 18 Z" fill="rgba(0,0,0,.3)"/>` +
      wheels([36, 90]),
  },
  suv: {
    /* Long AND tall, square shoulders, oversized wheels. */
    label: 'SUV / 4x4',
    svg:
      `<path d="M3 39 L3 17 C3 12 7 9 13 8 L46 4 C54 3 62 3 70 3 L88 4 C96 5 103 8 107 14 L113 21 C116 22 118 24 118 28 L118 39 Z" fill="currentColor"/>` +
      `<path d="M11 14 L46 10 L46 22 L11 22 Z M54 8 L70 7 L86 8 C92 9 97 11 100 15 L104 22 L54 22 Z" fill="rgba(0,0,0,.3)"/>` +
      wheels([32, 96], 9),
  },
  sports: {
    /* Wedge nose, cab pushed right back, rear spoiler. */
    label: 'Sports car',
    svg:
      `<path d="M2 39 L2 33 C2 30 5 28 10 27 L16 26.5 L12 20 L26 26 L48 22 C56 17 64 15 74 15 L86 15 C97 15 106 18 112 23 L117 28 C118 29 119 31 119 34 L119 39 Z" fill="currentColor"/>` +
      `<path d="M52 22.5 C58 18.5 65 17 73 17 L85 17 C92 17 98 19 103 22.5 L104 25 L50 25.5 Z" fill="rgba(0,0,0,.3)"/>` +
      wheels([32, 98]),
  },
  convertible: {
    /* Same low body, roof missing, windscreen leaning back. */
    label: 'Convertible',
    svg:
      `<path d="M3 39 L3 31 C3 28 6 26 11 25 L38 22 L52 21 L62 16 C68 14 74 13 80 13 L88 13 C97 13 105 16 111 21 L116 26 C118 27 118 30 118 33 L118 39 Z" fill="currentColor"/>` +
      `<path d="M56 20 L64 15.5 C68 14 72 13.5 76 13.5 L77 19 Z" fill="rgba(0,0,0,.3)"/>` +
      `<path d="M20 24 L44 21.5 L44 26 L20 27 Z" fill="rgba(0,0,0,.3)"/>` +
      wheels([32, 96]),
  },
  van: {
    label: 'Van',
    svg:
      `<path d="M4 39 L4 10 C4 7 6 5 10 5 L72 5 C78 5 82 7 86 11 L104 26 C110 27 116 29 116 34 L116 39 Z" fill="currentColor"/>` +
      `<path d="M62 10 L72 10 C75 10 77 11 79 13 L90 24 L62 24 Z M14 10 L54 10 L54 24 L14 24 Z" fill="rgba(0,0,0,.28)"/>` +
      wheels([30, 96]),
  },
  pickup: {
    label: 'Pickup truck',
    svg:
      `<path d="M4 39 L4 22 L52 22 L52 12 C52 8 55 6 60 6 L82 6 C89 6 95 9 99 14 L106 22 L110 23 C115 24 117 26 117 30 L117 39 Z" fill="currentColor"/>` +
      `<path d="M58 11 L80 11 C85 11 89 13 92 17 L96 22 L58 22 Z" fill="rgba(0,0,0,.28)"/>` +
      wheels([28, 92], 8),
  },
  lorry: {
    label: 'Lorry / HGV',
    svg:
      `<path d="M2 38 L2 4 L74 4 L74 38 Z" fill="currentColor"/>` +
      `<path d="M80 38 L80 14 C80 11 82 9 86 9 L100 9 C104 9 107 10 109 13 L116 23 C118 25 118 27 118 31 L118 38 Z" fill="currentColor"/>` +
      `<path d="M88 13 L100 13 C102 13 104 14 105 16 L110 23 L88 23 Z" fill="rgba(0,0,0,.28)"/>` +
      wheels([20, 44, 66, 100], 7),
  },
  bus: {
    label: 'Bus / coach',
    svg:
      `<path d="M3 38 L3 10 C3 7 6 5 10 5 L106 5 C112 5 117 8 117 14 L117 38 Z" fill="currentColor"/>` +
      `<path d="M12 11 L44 11 L44 22 L12 22 Z M52 11 L82 11 L82 22 L52 22 Z M90 11 L110 11 L110 22 L90 22 Z" fill="rgba(0,0,0,.28)"/>` +
      wheels([26, 96], 8),
  },
  taxi: {
    label: 'Taxi',
    svg:
      `<rect x="48" y="0" width="26" height="8" rx="3" fill="currentColor"/>` +
      `<path d="M6 39 C6 32 10 28 18 27 L34 25 L48 12 C52 9 57 8 63 8 L82 8 C90 8 96 10 101 15 L109 23 C114 25 117 28 117 33 L117 39 Z" fill="currentColor"/>` +
      `<path d="M38 25 L50 14 C53 11.5 57 10.5 61 10.5 L63 24 L38 24 Z M68 10.5 L82 10.5 C87 10.5 92 12 96 16 L103 24 L68 24 Z" fill="rgba(0,0,0,.28)"/>` +
      wheels([32, 95]),
  },
  camper: {
    label: 'Campervan',
    svg:
      `<path d="M4 39 L4 16 C4 12 7 9 12 9 L60 9 L60 4 L100 4 C108 4 112 7 112 13 L112 26 C116 28 118 30 118 34 L118 39 Z" fill="currentColor"/>` +
      `<path d="M14 15 L44 15 L44 26 L14 26 Z M66 9 L96 9 C100 9 102 11 102 14 L102 22 L66 22 Z" fill="rgba(0,0,0,.28)"/>` +
      wheels([30, 94], 7.5),
  },
  classic: {
    label: 'Classic / beetle',
    svg:
      `<path d="M10 39 C8 30 14 25 24 23 C30 11 42 4 60 4 C78 4 92 10 100 21 C108 23 113 27 113 33 L113 39 Z" fill="currentColor"/>` +
      `<path d="M32 21 C38 11 48 7 60 7 C74 7 86 12 93 20 Z" fill="rgba(0,0,0,.3)"/>` +
      wheels([34, 92], 7.5),
  },
  bike: {
    label: 'Motorbike',
    svg:
      `<path d="M24 35 L50 21 L68 21 L60 35 Z" fill="currentColor"/>` +
      `<path d="M38 17 L68 16 L68 23 L44 24 Z" fill="currentColor"/>` +
      `<path d="M68 20 L80 11 L86 13 L96 35 L88 35 L79 17 L72 24 Z" fill="currentColor"/>` +
      `<path d="M78 6 L98 4 L98 9 L82 12 Z" fill="currentColor"/>` +
      wheels([24, 96], 11),
  },
  tractor: {
    label: 'Tractor',
    svg:
      `<rect x="42" y="2" width="34" height="4" rx="2" fill="currentColor"/>` +
      `<path d="M44 6 L46 22 L74 22 L72 6 Z" fill="currentColor"/>` +
      `<rect x="78" y="12" width="5" height="16" fill="currentColor"/>` +
      `<path d="M60 22 L96 22 C101 22 104 24 104 28 L104 34 L60 34 Z" fill="currentColor"/>` +
      `<path d="M26 26 L104 26 L104 33 L26 33 Z" fill="currentColor"/>` +
      // Big driven wheel behind, small steering wheel up front.
      `<circle cx="34" cy="31" r="15" fill="currentColor"/><circle cx="34" cy="31" r="6" fill="${WHEEL_HUB}"/>` +
      `<circle cx="96" cy="39.5" r="6.5" fill="currentColor"/><circle cx="96" cy="39.5" r="2.8" fill="${WHEEL_HUB}"/>`,
  },
  emergency: {
    label: 'Emergency',
    svg:
      `<rect x="46" y="0" width="30" height="7" rx="3" fill="currentColor"/>` +
      `<path d="M4 39 L4 14 C4 10 7 8 12 8 L70 8 C77 8 82 10 86 15 L102 26 C110 27 116 29 116 34 L116 39 Z" fill="currentColor"/>` +
      `<path d="M14 13 L48 13 L48 25 L14 25 Z M62 13 L70 13 C73 13 76 14 78 17 L86 25 L62 25 Z" fill="rgba(0,0,0,.28)"/>` +
      wheels([30, 96]),
  },
};

/* Photographed specimens. These are mounted as plates rather than traced:
   a three-quarter view is what makes a car recognisable from the passenger
   seat, and tracing it to a side profile throws that away. Their studio
   background is toned to the paper, so a plate sits on the page. */
const CAR_PHOTOS = {
  'photo:tesla-y': { label: 'Tesla Model Y', src: 'assets/cars/tesla-model-y.webp', ratio: 1.18 },
  'photo:honda-jazz': { label: 'Honda Jazz', src: 'assets/cars/honda-jazz.webp', ratio: 1.16 },
};

/* A specimen mark is either a mounted plate or a drawn silhouette. Plates
   are real images so they scale themselves down to whatever room the sheet
   has, keeping their proportions without any height arithmetic. */
function carMark(key, cls = '') {
  const photo = CAR_PHOTOS[key];
  if (photo) {
    return `<img class="car-plate ${cls}" src="${photo.src}" alt="" aria-hidden="true">`;
  }
  return carSvg(key, cls);
}

function carLabel(key) {
  return CAR_PHOTOS[key] ? CAR_PHOTOS[key].label : (CAR_SHAPES[key] || CAR_SHAPES.ev).label;
}

const CAR_ORDER = [
  'photo:tesla-y', 'photo:honda-jazz',
  'ev', 'hatch', 'suv', 'sports', 'convertible', 'classic',
  'van', 'pickup', 'lorry', 'bus', 'camper', 'taxi', 'bike',
  'tractor', 'emergency',
];

/* Guess a silhouette from whatever the player types in the "car" field. */
const CAR_KEYWORDS = [
  [/tesla|model ?[3xy]\b/i, 'photo:tesla-y'],
  [/jazz|honda fit\b/i, 'photo:honda-jazz'],
  [/model ?s\b|electric|\bev\b|polestar|leaf|ioniq|saloon|sedan|bmw|mercedes|audi/i, 'ev'],
  [/jazz|fiesta|corsa|polo|golf|clio|yaris|hatch|mini|micra|up!|aygo|small/i, 'hatch'],
  [/suv|4x4|land ?rover|range ?rover|jeep|discovery|qashqai|tucson|x5|defender/i, 'suv'],
  [/ferrari|lambo|porsche|supercar|sports|gt3|mclaren|corvette|mustang|fast/i, 'sports'],
  [/convertible|cabrio|roadster|soft ?top|mx-?5|miata/i, 'convertible'],
  [/beetle|classic|vintage|old|herbie|morris|2cv/i, 'classic'],
  [/van|transit|sprinter|vivaro|courier|delivery/i, 'van'],
  [/pick ?up|ute|hilux|ranger|f-?150|truck bed/i, 'pickup'],
  [/lorry|hgv|artic|semi|18.?wheel|truck|tanker/i, 'lorry'],
  [/bus|coach|double ?decker|shuttle/i, 'bus'],
  [/camper|motorhome|caravan|rv\b|winnebago/i, 'camper'],
  [/taxi|cab\b|uber|black cab/i, 'taxi'],
  [/bike|motorbike|motorcycle|harley|scooter|moped|ducati/i, 'bike'],
  [/tractor|farm|combine|digger|jcb/i, 'tractor'],
  [/police|ambulance|fire|emergency|999|siren/i, 'emergency'],
];

function guessShape(text) {
  const t = (text || '').trim();
  if (!t) return null;
  for (const [re, shape] of CAR_KEYWORDS) if (re.test(t)) return shape;
  return null;
}

function carSvg(shape, className = '') {
  const s = CAR_SHAPES[shape] || CAR_SHAPES.ev;
  return `<svg class="${className}" viewBox="0 0 120 48" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">${s.svg}</svg>`;
}
