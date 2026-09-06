/* The saved-game model is independent of the interface so journey accounting
   can be checked without a browser. v1 totals remain raw sightings. */
const Game = (() => {
  const uid = () => Math.random().toString(36).slice(2, 11);
  const clone = value => JSON.parse(JSON.stringify(value));
  const number = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  const settings = () => ({ mode: 'classic', target: 10, teamTarget: 20, bonus: false, values: {} });
  function fresh() {
    return { version: 2, sound: true, theme: 'light', tripNumber: 1, tripStart: null,
      journeys: [], lastTrip: null, events: [], settings: settings(), tripRules: null,
      players: [player('Dad', 'model-y', '#1c6e63'), player('Molly', 'jazz', '#a13a2e')] };
  }
  function player(name, car, color) {
    return { id: uid(), name, car, color, trip: 0, total: 0, wins: 0, points: 0, tripPoints: 0, carSpots: 0, bests: {} };
  }
  function migrate(raw, cars) {
    if (!raw || !Array.isArray(raw.players) || !raw.players.length) return fresh();
    const s = Object.assign(fresh(), raw);
    s.settings = Object.assign(settings(), raw.settings || {});
    s.settings.values = s.settings.values || {};
    s.journeys = Array.isArray(raw.journeys) ? raw.journeys : [];
    s.events = Array.isArray(raw.events) ? raw.events : [];
    s.players = raw.players.map(p => ({ ...p, id: p.id || uid(), name: String(p.name || ''),
      car: cars[p.car] ? p.car : 'model-y', color: /^#[\da-f]{6}$/i.test(p.color) ? p.color : '#1c6e63',
      trip: number(p.trip), total: number(p.total), wins: number(p.wins),
      points: number(p.points ?? p.total), tripPoints: number(p.tripPoints ?? p.trip),
      carSpots: number(p.carSpots ?? p.trip), bests: p.bests || {} }));
    if (raw.version !== 2) {
      for (const j of s.journeys) for (const score of j.scores || []) {
        const p = s.players.find(p => p.id === score.id);
        if (p) p.bests[score.car] = Math.max(p.bests[score.car] || 0, number(score.score));
      }
    }
    s.version = 2;
    if (s.tripStart && !s.tripRules) s.tripRules = { ...settings(), bonusCar: null, values: {} };
    return s;
  }
  function start(s, cars, now = Date.now(), random = Math.random) {
    if (s.tripStart) return false;
    if (s.lastTrip) {
      s.tripNumber += 1;
      // Only the latest journey needs recovery data. Keep the archive compact.
      const archived = s.journeys[s.journeys.length - 1];
      if (archived) { delete archived.events; delete archived.previousBests; delete archived.evicted; }
    }
    s.lastTrip = null;
    s.events = [];
    s.players.forEach((p, i) => { p.name = p.name.trim() || `Player ${i + 1}`; p.trip = 0; p.tripPoints = 0; p.carSpots = 0; });
    const candidates = Object.keys(cars).filter(key => !s.players.some(p => p.car === key));
    s.tripRules = clone(s.settings);
    s.tripRules.values = Object.fromEntries(Object.entries(cars).map(([key, car]) => [key, Math.max(1, Math.min(5, number(s.settings.values[key] || car.value || 1)))]));
    s.tripRules.bonusCar = s.settings.bonus && candidates.length ? candidates[Math.floor(random() * candidates.length)] : null;
    s.tripStart = now;
    return true;
  }
  function add(s, id, bonus = false, now = Date.now()) {
    const p = s.players.find(p => p.id === id);
    if (!s.tripStart || !p || (bonus && !s.tripRules.bonusCar)) return null;
    const car = bonus ? s.tripRules.bonusCar : p.car;
    const points = bonus ? 3 : s.tripRules.mode === 'rarity' ? s.tripRules.values[car] || 1 : 1;
    const event = { id: uid(), playerId: id, car, points, bonus, at: now };
    p.trip++; p.total++; p.tripPoints += points; p.points += points;
    if (!bonus) p.carSpots++;
    s.events.push(event);
    return event;
  }
  function remove(s, id, eventId) {
    if (!s.tripStart) return null;
    const p = s.players.find(p => p.id === id);
    if (!p || !p.trip) return null;
    let index = -1;
    for (let i = s.events.length - 1; i >= 0; i--) {
      if (s.events[i].playerId === id && (!eventId || s.events[i].id === eventId)) { index = i; break; }
    }
    if (eventId && index < 0) return null;
    // v1 active journeys have no event log; those sightings were one point each.
    const event = index >= 0 ? s.events.splice(index, 1)[0] : { playerId: id, points: 1, bonus: false, car: p.car };
    p.trip--; p.total = Math.max(0, p.total - 1);
    p.tripPoints = Math.max(0, p.tripPoints - event.points); p.points = Math.max(0, p.points - event.points);
    if (!event.bonus) p.carSpots = Math.max(0, p.carSpots - 1);
    return event;
  }
  function finish(s, now = Date.now()) {
    if (!s.tripStart) return null;
    const top = Math.max(...s.players.map(p => p.tripPoints));
    const winners = s.players.filter(p => p.tripPoints === top && top > 0);
    const highlights = [];
    const previousBests = Object.fromEntries(s.players.map(p => [p.id, clone(p.bests)]));
    for (const p of s.players) {
      const previous = p.bests[p.car] || 0;
      if (p.carSpots > previous) {
        highlights.push({ name: p.name, car: p.car, count: p.carSpots, first: !previous });
        p.bests[p.car] = p.carSpots;
      }
    }
    const t = { number: s.tripNumber, duration: now - s.tripStart, startedAt: s.tripStart, endedAt: now,
      scores: s.players.map(p => ({ id: p.id, name: p.name, car: p.car, color: p.color, score: p.tripPoints, spots: p.trip, carSpots: p.carSpots })),
      winnerIds: winners.map(p => p.id), rules: clone(s.tripRules), highlights, previousBests, events: clone(s.events) };
    winners.forEach(p => p.wins++);
    s.journeys.push(t);
    if (s.journeys.length > 500) t.evicted = s.journeys.shift();
    s.lastTrip = t; s.tripStart = null;
    return t;
  }
  function canReopen(s) {
    const t = s.lastTrip;
    return !s.tripStart && !!t && !!t.startedAt && s.journeys[s.journeys.length - 1]?.number === t.number &&
      t.scores.length === s.players.length && t.scores.every(sc => s.players.some(p => p.id === sc.id && p.car === sc.car && p.name === sc.name));
  }
  function reopen(s, now = Date.now()) {
    if (!canReopen(s)) return false;
    const t = s.lastTrip;
    for (const p of s.players) {
      const sc = t.scores.find(sc => sc.id === p.id);
      if (t.winnerIds.includes(p.id)) p.wins = Math.max(0, p.wins - 1);
      p.trip = sc.spots; p.tripPoints = sc.score; p.carSpots = sc.carSpots;
      p.bests = clone(t.previousBests[p.id]);
    }
    s.tripStart = now - t.duration; s.tripRules = clone(t.rules); s.events = clone(t.events);
    s.journeys.pop(); if (t.evicted) s.journeys.unshift(t.evicted); s.lastTrip = null;
    return true;
  }
  function swap(s) {
    if (s.tripStart || s.players.length < 2) return false;
    const cars = s.players.map(p => p.car);
    s.players.forEach((p, i) => { p.car = cars[(i + 1) % cars.length]; });
    return true;
  }
  function raceWon(s) {
    return !!s.tripStart && s.tripRules.mode === 'race' && s.players.some(p => p.tripPoints >= s.tripRules.target);
  }
  function simplify(s) {
    s.settings = { mode: 'classic', target: 0, teamTarget: 0, bonus: false, values: {} };
    if (s.tripRules) s.tripRules = { ...s.tripRules, ...s.settings, bonusCar: null };
  }
  return { simplify, fresh, player, migrate, start, add, remove, finish, reopen, canReopen, swap, raceWon };
})();
if (typeof module !== 'undefined') module.exports = Game;
