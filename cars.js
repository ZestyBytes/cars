/* Any model, colour or age of the selected brand counts. Logos are stored locally for offline play. */
const CARS = {
  "abarth": {
    "label": "Abarth",
    "src": "assets/brands/abarth.png",
    "value": 1
  },
  "alfa-romeo": {
    "label": "Alfa Romeo",
    "src": "assets/brands/alfa-romeo.png",
    "value": 1
  },
  "aston-martin": {
    "label": "Aston Martin",
    "src": "assets/brands/aston-martin.png",
    "value": 1
  },
  "audi": {
    "label": "Audi",
    "src": "assets/brands/audi.png",
    "value": 1
  },
  "bentley": {
    "label": "Bentley",
    "src": "assets/brands/bentley.png",
    "value": 1
  },
  "bmw": {
    "label": "BMW",
    "src": "assets/brands/bmw.png",
    "value": 1
  },
  "byd": {
    "label": "BYD",
    "src": "assets/brands/byd.png",
    "value": 1
  },
  "chevrolet": {
    "label": "Chevrolet",
    "src": "assets/brands/chevrolet.png",
    "value": 1
  },
  "citroen": {
    "label": "Citroën",
    "src": "assets/brands/citroen.png",
    "value": 1
  },
  "cupra": {
    "label": "Cupra",
    "src": "assets/brands/cupra.png",
    "value": 1
  },
  "dacia": {
    "label": "Dacia",
    "src": "assets/brands/dacia.png",
    "value": 1
  },
  "ds": {
    "label": "DS",
    "src": "assets/brands/ds.png",
    "value": 1
  },
  "ferrari": {
    "label": "Ferrari",
    "src": "assets/brands/ferrari.png",
    "value": 1
  },
  "fiat": {
    "label": "Fiat",
    "src": "assets/brands/fiat.png",
    "value": 1
  },
  "ford": {
    "label": "Ford",
    "src": "assets/brands/ford.png",
    "value": 1
  },
  "genesis": {
    "label": "Genesis",
    "src": "assets/brands/genesis.png",
    "value": 1
  },
  "honda": {
    "label": "Honda",
    "src": "assets/brands/honda.png",
    "value": 1
  },
  "hyundai": {
    "label": "Hyundai",
    "src": "assets/brands/hyundai.png",
    "value": 1
  },
  "jaguar": {
    "label": "Jaguar",
    "src": "assets/brands/jaguar.png",
    "value": 1
  },
  "jeep": {
    "label": "Jeep",
    "src": "assets/brands/jeep.png",
    "value": 1
  },
  "kia": {
    "label": "Kia",
    "src": "assets/brands/kia.png",
    "value": 1
  },
  "lamborghini": {
    "label": "Lamborghini",
    "src": "assets/brands/lamborghini.png",
    "value": 1
  },
  "land-rover": {
    "label": "Land Rover",
    "src": "assets/brands/land-rover.png",
    "value": 1
  },
  "lexus": {
    "label": "Lexus",
    "src": "assets/brands/lexus.png",
    "value": 1
  },
  "lotus": {
    "label": "Lotus",
    "src": "assets/brands/lotus.png",
    "value": 1
  },
  "maserati": {
    "label": "Maserati",
    "src": "assets/brands/maserati.png",
    "value": 1
  },
  "mazda": {
    "label": "Mazda",
    "src": "assets/brands/mazda.png",
    "value": 1
  },
  "mclaren": {
    "label": "McLaren",
    "src": "assets/brands/mclaren.png",
    "value": 1
  },
  "mercedes-benz": {
    "label": "Mercedes-Benz",
    "src": "assets/brands/mercedes-benz.png",
    "value": 1
  },
  "mg": {
    "label": "MG",
    "src": "assets/brands/mg.png",
    "value": 1
  },
  "mini": {
    "label": "MINI",
    "src": "assets/brands/mini.png",
    "value": 1
  },
  "mitsubishi": {
    "label": "Mitsubishi",
    "src": "assets/brands/mitsubishi.png",
    "value": 1
  },
  "nissan": {
    "label": "Nissan",
    "src": "assets/brands/nissan.png",
    "value": 1
  },
  "peugeot": {
    "label": "Peugeot",
    "src": "assets/brands/peugeot.png",
    "value": 1
  },
  "polestar": {
    "label": "Polestar",
    "src": "assets/brands/polestar.png",
    "value": 1
  },
  "porsche": {
    "label": "Porsche",
    "src": "assets/brands/porsche.png",
    "value": 1
  },
  "renault": {
    "label": "Renault",
    "src": "assets/brands/renault.png",
    "value": 1
  },
  "rolls-royce": {
    "label": "Rolls-Royce",
    "src": "assets/brands/rolls-royce.png",
    "value": 1
  },
  "saab": {
    "label": "Saab",
    "src": "assets/brands/saab.png",
    "value": 1
  },
  "seat": {
    "label": "SEAT",
    "src": "assets/brands/seat.png",
    "value": 1
  },
  "skoda": {
    "label": "Škoda",
    "src": "assets/brands/skoda.png",
    "value": 1
  },
  "smart": {
    "label": "Smart",
    "src": "assets/brands/smart.png",
    "value": 1
  },
  "ssangyong": {
    "label": "SsangYong",
    "src": "assets/brands/ssangyong.png",
    "value": 1
  },
  "subaru": {
    "label": "Subaru",
    "src": "assets/brands/subaru.png",
    "value": 1
  },
  "suzuki": {
    "label": "Suzuki",
    "src": "assets/brands/suzuki.png",
    "value": 1
  },
  "tesla": {
    "label": "Tesla",
    "src": "assets/brands/tesla.png",
    "value": 1
  },
  "toyota": {
    "label": "Toyota",
    "src": "assets/brands/toyota.png",
    "value": 1
  },
  "vauxhall": {
    "label": "Vauxhall",
    "src": "assets/brands/vauxhall.png",
    "value": 1
  },
  "volkswagen": {
    "label": "Volkswagen",
    "src": "assets/brands/volkswagen.png",
    "value": 1
  },
  "volvo": {
    "label": "Volvo",
    "src": "assets/brands/volvo.png",
    "value": 1
  }
};
const CAR_ORDER = Object.keys(CARS);
function carMark(key, cls = '') {
  const car = CARS[key] || CARS.tesla;
  return `<img class="car-plate brand-logo ${cls}" src="${car.src}" alt="${car.label} logo" width="320" height="240" draggable="false">`;
}
function carLabel(key) { return (CARS[key] || CARS.tesla).label; }
