const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Game = require('../game.js');
const catalog = vm.runInNewContext(fs.readFileSync(require.resolve('../cars.js'), 'utf8') + '; CARS');
const fresh = () => Game.fresh();
function started(settings = {}) { const s = fresh(); Object.assign(s.settings, settings); Game.start(s, catalog, 1000, () => .5); return s; }

test('v1 migration preserves raw totals, wins, active journey and car records', () => {
  const raw = { version: 1, tripNumber: 8, tripStart: 100, players: [{ id: 'dad', name: 'Dad', car: 'model-y', color: '#1c6e63', trip: 4, total: 52, wins: 6 }], journeys: [{ scores: [{ id: 'dad', car: 'model-y', score: 12 }] }] };
  const s = Game.migrate(raw, catalog);
  assert.equal(s.players[0].total, 52); assert.equal(s.players[0].points, 52);
  assert.equal(s.players[0].tripPoints, 4); assert.equal(s.players[0].bests['model-y'], 12);
  Game.remove(s, 'dad'); assert.equal(s.players[0].trip, 3); assert.equal(s.players[0].points, 51);
  assert.equal(s.players[0].wins, 6); assert.equal(s.tripNumber, 8);
});
test('classic scoring, targeted undo and zero floor', () => {
  const s = started(), p = s.players[0];
  const a = Game.add(s, p.id), b = Game.add(s, p.id);
  assert.equal(p.trip, 2); assert.equal(p.points, 2);
  assert.equal(Game.remove(s, p.id, a.id).id, a.id);
  assert.equal(Game.remove(s, p.id, a.id), null);
  assert.equal(Game.remove(s, p.id).id, b.id);
  assert.equal(Game.remove(s, p.id), null); assert.equal(p.points, 0); assert.equal(p.total, 0);
});
test('rarity snapshots settings, separates sightings/points and survives reload', () => {
  const s = started({ mode: 'rarity', values: { jazz: 4 } }), p = s.players[1];
  s.settings.values.jazz = 1;
  Game.add(s, p.id); Game.add(s, p.id);
  assert.equal(p.total, 2); assert.equal(p.points, 8); assert.equal(p.carSpots, 2);
  const loaded = Game.migrate(JSON.parse(JSON.stringify(s)), catalog);
  Game.remove(loaded, p.id);
  assert.equal(loaded.players[1].points, 4); assert.equal(loaded.players[1].total, 1);
});
test('bonus never overlaps player targets; claims are undoable and excluded from car bests', () => {
  const s = started({ bonus: true }), p = s.players[0];
  assert.ok(s.tripRules.bonusCar); assert.ok(!s.players.some(p => p.car === s.tripRules.bonusCar));
  const e = Game.add(s, p.id, true);
  assert.equal(p.tripPoints, 3); assert.equal(p.total, 1); assert.equal(p.carSpots, 0);
  Game.remove(s, p.id, e.id); assert.equal(p.points, 0);
  Game.add(s, p.id, true); Game.finish(s, 3000); assert.equal(p.bests[p.car], undefined);
});
test('disabled bonus and scoring outside an active game do nothing', () => {
  const s = fresh(), id = s.players[0].id;
  assert.equal(Game.add(s, id), null); assert.equal(Game.finish(s), null);
  Game.start(s, catalog, 1000); assert.equal(Game.add(s, id, true), null);
  Game.finish(s, 2000); assert.equal(Game.add(s, id), null); assert.equal(Game.remove(s, id), null);
});
test('finish is idempotent; ties award both players and zero games award nobody', () => {
  const s = started(); s.players.forEach(p => Game.add(s, p.id));
  Game.finish(s, 2000); assert.equal(s.journeys.length, 1); assert.deepEqual(s.players.map(p => p.wins), [1, 1]);
  assert.equal(Game.finish(s, 2500), null); assert.equal(s.journeys.length, 1);
  const zero = started(); Game.finish(zero, 2000); assert.deepEqual(zero.players.map(p => p.wins), [0, 0]);
});
test('reopen rolls back awards/bests, preserves elapsed time and supports correcting the winner', () => {
  const s = started(), [dad, molly] = s.players;
  Game.add(s, dad.id); Game.add(s, dad.id); Game.add(s, molly.id);
  Game.finish(s, 6000); assert.equal(dad.wins, 1); assert.equal(dad.bests[dad.car], 2);
  assert.equal(Game.reopen(s, 10000), true); assert.equal(s.tripStart, 5000); assert.equal(dad.wins, 0);
  assert.equal(dad.bests[dad.car], undefined); assert.equal(s.journeys.length, 0);
  Game.remove(s, dad.id); Game.remove(s, dad.id); Game.finish(s, 11000);
  assert.equal(molly.wins, 1); assert.equal(dad.wins, 0); assert.equal(dad.points, 0); assert.equal(s.journeys.length, 1);
});
test('rematch and swap preserve all-time stats, clear active counters and advance journey exactly once', () => {
  const s = started(), p = s.players[0]; Game.add(s, p.id); Game.finish(s, 2000);
  Game.swap(s); assert.equal(p.car, 'jazz'); assert.equal(Game.canReopen(s), false);
  Game.start(s, catalog, 3000); assert.equal(s.tripNumber, 2); assert.equal(p.total, 1); assert.equal(p.trip, 0); assert.equal(p.wins, 1);
  assert.equal(Game.start(s, catalog, 4000), false); assert.equal(s.tripNumber, 2);
});
test('personal bests improve only on more sightings of the same model', () => {
  const s = started(), p = s.players[0]; Game.add(s, p.id); Game.finish(s, 2000);
  Game.start(s, catalog, 3000); Game.add(s, p.id); Game.finish(s, 4000);
  assert.equal(s.lastTrip.highlights.length, 0);
  Game.start(s, catalog, 5000); Game.add(s, p.id); Game.add(s, p.id); Game.finish(s, 6000);
  assert.equal(s.lastTrip.highlights[0].count, 2); assert.equal(s.lastTrip.highlights[0].first, false);
});
test('removed or renamed roster cannot accidentally reopen and corrupt wins', () => {
  const s = started(); Game.add(s, s.players[0].id); Game.finish(s, 2000);
  s.players.pop(); assert.equal(Game.reopen(s), false);
});
test('all catalog posters exist and all local shell requests are in offline cache', () => {
  assert.equal(Object.keys(catalog).length, 10);
  const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  const worker = fs.readFileSync(require.resolve('../sw.js'), 'utf8');
  for (const car of Object.values(catalog)) { assert.ok(fs.statSync(require.resolve('../' + car.src)).size > 1000); assert.ok(worker.includes('./' + car.src)); }
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+\?v=11)"/g)) assert.ok(worker.includes('./' + url), url);
});
test('quick round triggers at target, including bonus overshoot; undo then reopen remains playable', () => {
  const s = started({ mode: 'race', target: 5, bonus: true }), p = s.players[0];
  Game.add(s, p.id); Game.add(s, p.id); Game.add(s, p.id); assert.equal(Game.raceWon(s), false);
  Game.add(s, p.id, true); assert.equal(Game.raceWon(s), true);
  Game.finish(s, 4000); Game.reopen(s, 5000); Game.remove(s, p.id);
  assert.equal(Game.raceWon(s), false); assert.equal(p.tripPoints, 3);
});
test('reopening at archive limit restores the oldest record rather than silently losing it', () => {
  const s = started(); s.journeys = Array.from({ length: 500 }, (_, i) => ({ number: i, scores: [] }));
  Game.finish(s, 2000); assert.equal(s.journeys.length, 500);
  Game.reopen(s, 3000); assert.equal(s.journeys.length, 500); assert.equal(s.journeys[0].number, 0);
});
test('simplification preserves legacy scores and undo values but new sightings always earn one point', () => {
  const s = started({ mode: 'rarity', bonus: true, values: { jazz: 4 } });
  const p = s.players[1];
  const old = Game.add(s, p.id);
  Game.simplify(s);
  assert.equal(p.points, 4);
  assert.equal(s.tripRules.bonusCar, null);
  assert.equal(s.settings.teamTarget, 0);
  assert.equal(Game.add(s, p.id).points, 1);
  Game.remove(s, p.id, old.id);
  assert.equal(p.points, 1);
  Game.finish(s, 2000); Game.start(s, catalog, 3000);
  assert.equal(s.tripRules.bonusCar, null);
  assert.equal(Game.add(s, p.id).points, 1);
});
