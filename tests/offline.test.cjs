const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function worker({ cached, network = async () => new Response('fresh'), shell = new Response('offline html') } = {}) {
  const handlers = {}, deleted = [];
  const cache = { match: async request => request === './index.html' ? shell : cached, addAll: async () => {} };
  const sandbox = { URL, Response, fetch: network, caches: { open: async () => cache, keys: async () => ['spotted-v8', 'spotted-v11', 'another-app'], delete: async key => deleted.push(key) }, self: { location: { origin: 'https://example.org' }, skipWaiting: async () => {}, clients: { claim: async () => {} }, addEventListener: (name, fn) => handlers[name] = fn } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../sw.js'), 'utf8'), sandbox);
  return { handlers, deleted, request: async (mode = 'cors', url = 'https://example.org/cars/assets/car.webp') => { let response; handlers.fetch({ request: { url, method: 'GET', mode }, respondWith: p => response = p }); return response; } };
}
test('offline posters use cached assets without waiting for network', async () => {
  const w = worker({ cached: new Response('poster'), network: () => { throw Error('must not fetch'); } });
  assert.equal(await (await w.request()).text(), 'poster');
});
test('offline navigation uses shell but missing images never receive HTML', async () => {
  const w = worker({ network: async () => { throw Error('offline'); } });
  assert.equal(await (await w.request('navigate')).text(), 'offline html');
  assert.equal((await w.request()).type, 'error');
});
test('new shell comes from network, cross-origin requests are untouched and unrelated caches survive', async () => {
  const w = worker({ cached: new Response('old') });
  assert.equal(await (await w.request('navigate')).text(), 'fresh');
  assert.equal(await w.request('cors', 'https://other.org/image'), undefined);
  let activation; w.handlers.activate({ waitUntil: p => activation = p }); await activation;
  assert.deepEqual(w.deleted, ['spotted-v8']);
});
