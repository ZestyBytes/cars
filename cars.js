/* England road-trip collection. Point values are editable house rules,
   not measured rarity. Any colour or generation of the named model counts. */
const CARS = {
  'model-y': { label: 'Tesla Model Y', src: 'assets/cars/tesla-model-y.webp', type: 'SUV', value: 1, hint: 'Tall Tesla body, curved roof and a smooth nose.' },
  'jazz': { label: 'Honda Jazz', src: 'assets/cars/honda-jazz.webp', type: 'Small car', value: 2, hint: 'A small, tall hatchback with a short bonnet and big windows.' },
  'fiesta': { label: 'Ford Fiesta', src: 'assets/cars/ford-fiesta.webp', type: 'Small car', value: 1, hint: 'A compact hatchback. Look for the blue Ford badge.' },
  'corsa': { label: 'Vauxhall Corsa', src: 'assets/cars/vauxhall-corsa.webp', type: 'Small car', value: 1, hint: 'Small hatchback with the Vauxhall griffin badge.' },
  'golf': { label: 'Volkswagen Golf', src: 'assets/cars/volkswagen-golf.webp', type: 'Hatchback', value: 1, hint: 'VW badge and a broad rear pillar. Bigger than a Polo.' },
  'mini': { label: 'MINI Hatch', src: 'assets/cars/mini-hatch.webp', type: 'Small car', value: 1, hint: 'Round headlights and a compact body; often a contrasting roof.' },
  'qashqai': { label: 'Nissan Qashqai', src: 'assets/cars/nissan-qashqai.webp', type: 'SUV', value: 1, hint: 'A family SUV with the Nissan badge. Check its name on the back.' },
  'sportage': { label: 'Kia Sportage', src: 'assets/cars/kia-sportage.webp', type: 'SUV', value: 2, hint: 'A family SUV; newer versions have boomerang-shaped running lights.' },
  'model-3': { label: 'Tesla Model 3', src: 'assets/cars/tesla-model-3.webp', type: 'Saloon', value: 2, hint: 'Lower and sleeker than the Model Y, with a separate boot.' },
  '500': { label: 'Fiat 500', src: 'assets/cars/fiat-500.webp', type: 'Small car', value: 2, hint: 'A tiny rounded car with round headlights. Count the small 500, not the 500X.' },
};
const CAR_ORDER = Object.keys(CARS);
function carMark(key, cls = '') {
  const car = CARS[key] || CARS['model-y'];
  return `<img class="car-plate ${cls}" src="${car.src}" alt="${car.label}" width="400" height="520" draggable="false">`;
}
function carLabel(key) { return (CARS[key] || CARS['model-y']).label; }
