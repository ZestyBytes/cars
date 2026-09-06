/* ------------------------------------------------------------------
   cars.js — the two cars in this game. Nothing else is spottable:
   Dad hunts the Model Y, Molly hunts the Jazz, and any extra spotter
   picks one of the same two.
   ------------------------------------------------------------------ */

const CARS = {
  'model-y': { label: 'Tesla Model Y', src: 'assets/cars/tesla-model-y.webp' },
  'jazz': { label: 'Honda Jazz', src: 'assets/cars/honda-jazz.webp' },
};

const CAR_ORDER = ['model-y', 'jazz'];

/* The artwork names the car itself, so nothing else has to. */
function carMark(key, cls = '') {
  const car = CARS[key] || CARS['model-y'];
  return `<img class="car-plate ${cls}" src="${car.src}" alt="${car.label}">`;
}

function carLabel(key) {
  return (CARS[key] || CARS['model-y']).label;
}
