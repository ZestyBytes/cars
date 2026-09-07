/* Spotted: a dependency-free, device-local family road book. */
const STORE_KEY = 'carspotter.v1'; // Keep the original key and migrate in place.
const COLORS = ['#1c6e63', '#a13a2e', '#3f6b2e', '#5b4a9e', '#8a5a12', '#96355a'];
// Each point sound is a tiny score: notes, the shape of the tone, and how
// long each note rings. Distinct enough to tell apart from the back seat.
const SOUNDS = [
  { name: 'Warm bell', notes: [392, 523.25], type: 'triangle', hold: .16 },
  { name: 'Bright chime', notes: [659.25, 880], type: 'triangle', hold: .16 },
  { name: 'Marimba', notes: [523.25, 659.25], type: 'sine', hold: .12 },
  { name: 'Coin', notes: [987.77, 1318.51], type: 'square', hold: .1, gap: 70, gain: .05 },
  { name: 'Car horn', notes: [370, 311.13], type: 'sawtooth', hold: .26, gap: 0, gain: .045 },
  { name: 'Boing', notes: [880, 220], type: 'sine', hold: .22, gap: 40, slide: true },
  { name: 'Pop', notes: [660, 990], type: 'sine', hold: .07, gap: 55 },
  { name: 'Whistle', notes: [523.25, 1046.5], type: 'sine', hold: .18, gap: 60, slide: true },
  { name: 'Birdsong', notes: [587.33, 783.99], type: 'triangle', hold: .14 },
  { name: 'Low bell', notes: [349.23, 440], type: 'triangle', hold: .2 },
];
const COLOR_NAMES = ['Teal', 'Terracotta', 'Green', 'Purple', 'Ochre', 'Berry'];
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escapeHtml = str => String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
let loadWarning = false;
let state;
try { state = Game.migrate(JSON.parse(localStorage.getItem(STORE_KEY)), CARS); }
catch { state = Game.fresh(); loadWarning = true; }
// Retain historical weighted scores and undo events; future sightings are one point.
Game.simplify(state);
state.players.forEach((p, i) => { if (!Number.isInteger(p.sound) || !SOUNDS[p.sound]) p.sound = i % SOUNDS.length; });
let timerId, wakeLock, audioCtx, toastTimer, toastAction, modalReturnFocus, modalCleanup;
let currentTab = 'trip';
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); return true; }
  catch { toast('Storage is unavailable. Keep this page open: changes may not survive a reload.', null, 0); return false; }
}
function findPlayer(id) { return state.players.find(p => p.id === id); }
function fmtDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const pad = n => String(n).padStart(2, '0');
  return seconds >= 3600 ? `${Math.floor(seconds / 3600)}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}` : `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}
function showScreen(id) {
  $$('.screen').forEach(el => el.classList.toggle('is-active', el.id === id));
  dismissToast();
  if (id === 'screen-game') requestWakeLock(); else releaseWakeLock();
  window.scrollTo(0, 0);
}
function renderEditor() {
  $('#player-editor').innerHTML = state.players.map((p, i) => `<article class="pcard" style="--c:${p.color}">
    <div class="pcard-top"><strong>SPOTTER ${String(i + 1).padStart(2, '0')}</strong>${state.players.length > 1 ? `<button class="pcard-remove" data-remove="${p.id}">Remove</button>` : ''}</div>
    <div class="pcard-body"><button class="car-select" data-pick="${p.id}" aria-label="Choose car for ${escapeHtml(p.name || 'player')}">${carMark(p.car)}<span>Change car ↗</span></button>
      <div class="pcard-fields"><label>Player name<input class="field" data-name="${p.id}" value="${escapeHtml(p.name)}" maxlength="18" autocomplete="off" placeholder="Name"></label>
      <div><p class="eyebrow">Looking for</p><h3 class="selected-car-name">${carLabel(p.car)}</h3></div>
      <div class="swatches" aria-label="Player colour">${COLORS.map((c, i) => `<button class="swatch" style="--sc:${c}" data-color="${p.id}" data-value="${c}" aria-pressed="${c === p.color}" aria-label="${COLOR_NAMES[i]}"></button>`).join('')}</div>
      <label>Point sound<div class="sound-picker"><select data-sound="${p.id}" aria-label="Sound for ${escapeHtml(p.name)}">${SOUNDS.map((sound, n) => `<option value="${n}" ${n === (p.sound ?? i % SOUNDS.length) ? 'selected' : ''}>${sound.name}</option>`).join('')}</select><button class="btn" data-preview="${p.id}" aria-label="Preview sound for ${escapeHtml(p.name)}">▶</button></div></label>
      <p class="hint">${p.bests[p.car] ? `Best trip: ${p.bests[p.car]} ${carLabel(p.car)} spots` : 'A fresh page for your next adventure.'}</p></div></div></article>`).join('');
  $('#ready-players').innerHTML = state.players.map(p => `<span>${carMark(p.car)}<b>${escapeHtml(p.name || 'Player')}</b><small>${carLabel(p.car)}</small></span>`).join('');
  $$('[data-sound]').forEach(el => el.onchange = () => { findPlayer(el.dataset.sound).sound = Number(el.value); save(); });
  $$('[data-preview]').forEach(el => el.onclick = () => playerSound(el.dataset.preview, true));
  $$('[data-name]').forEach(el => el.oninput = () => { findPlayer(el.dataset.name).name = el.value; save(); });
  $$('[data-pick]').forEach(el => el.onclick = () => openLibrary(el.dataset.pick));
  $$('[data-color]').forEach(el => el.onclick = () => { findPlayer(el.dataset.color).color = el.dataset.value; save(); renderEditor(); });

  $$('[data-remove]').forEach(el => el.onclick = () => confirmDialog('Remove this player?', 'Their previous trips stay in the log. Their current overall totals will be removed from the leaderboard.', () => {
    state.players = state.players.filter(p => p.id !== el.dataset.remove); save(); renderEditor();
  }, 'Remove player'));
  $('#btn-add-player').disabled = state.players.length >= 6;

}
function openLibrary(playerId) {
  const p = findPlayer(playerId);
  openModal(`A car for ${p.name || 'your spotter'}`, `
    <div class="library-tools"><input class="field" id="car-search" type="search" placeholder="Find a car…" aria-label="Search car library"><select id="car-filter" aria-label="Filter cars"><option value="">All cars</option><option>Small car</option><option>Hatchback</option><option>SUV</option><option>Saloon</option></select></div>
    <div class="library-grid" id="library-grid"></div>`, 'library');
  const render = () => {
    const query = $('#car-search').value.toLowerCase().trim();
    const type = $('#car-filter').value;
    const keys = CAR_ORDER.filter(key => CARS[key].label.toLowerCase().includes(query) && (!type || CARS[key].type === type));
    $('#library-grid').innerHTML = keys.length ? keys.map(key => `<button class="library-option" data-library-car="${key}" aria-pressed="${p.car === key}">${carMark(key)}<b>${carLabel(key)}</b><small>${CARS[key].type}</small></button>`).join('') : '<p class="hint">No matches. Try a make, like Ford or Tesla.</p>';
    $$('[data-library-car]').forEach(el => el.onclick = () => { p.car = el.dataset.libraryCar; save(); renderEditor(); modalReturnFocus = $(`[data-pick="${p.id}"]`); closeModal(); });
  };
  $('#car-search').oninput = render; $('#car-filter').onchange = render; render();
}
function startTrip() {
  if (state.tripStart) return;
  Game.start(state, CARS);
  renderBoard(); showScreen('screen-game'); startTimer(); save();
}
function renderBoard() {
  $('#board').dataset.count = state.players.length;
  $('#board').innerHTML = state.players.map(p => `<article class="panel" style="--c:${p.color}" data-panel="${p.id}">
    <button class="spot-button" data-spot="${p.id}" aria-label="${escapeHtml(p.name)} spotted a ${carLabel(p.car)}">
      <span class="panel-name"><span class="name-tag">${escapeHtml(p.name)}</span></span><span class="panel-model">${carLabel(p.car)}</span>
      <span class="panel-art">${carMark(p.car)}</span><span class="score-line"><span class="panel-score" data-score="${p.id}">${p.tripPoints}</span><span class="score-unit">points</span></span>
      <span class="spot-label">Tap to spot · +1</span>
    </button><div class="panel-bottom"><span class="panel-detail" data-detail="${p.id}"></span><button class="btn panel-minus" data-minus="${p.id}" aria-label="Undo last sighting for ${escapeHtml(p.name)}">−1</button></div></article>`).join('');
  $$('[data-panel]').forEach(el => {
    el.onclick = e => { if (!e.target.closest('[data-minus]')) score(el.dataset.panel); };
    ['contextmenu', 'selectstart', 'dragstart'].forEach(type => el.addEventListener(type, e => e.preventDefault()));
  });
  $$('[data-minus]').forEach(el => el.onclick = () => unscore(el.dataset.minus));
  $('#trip-number').textContent = state.tripNumber;
  updateGame();
}
function leadText() {
  const ranked = [...state.players].sort((a, b) => b.tripPoints - a.tripPoints);
  const top = ranked[0].tripPoints;
  if (!top) return { title: 'Off we go!', detail: 'Who will spot the first car?' };
  if (ranked.length === 1) return { title: `${top} points spotted`, detail: 'Every car adds to your story.' };
  const leaders = ranked.filter(p => p.tripPoints === top);
  if (leaders.length > 1) return { title: 'All square!', detail: `${leaders.map(p => p.name).join(' & ')} on ${top} points` };
  const gap = top - ranked[1].tripPoints;
  return { title: `${ranked[0].name} leads by ${gap}`, detail: `${ranked[0].tripPoints}–${ranked[1].tripPoints} · plenty more to spot` };
}
function standingsMarkup() {
  const ranked = [...state.players].sort((a, b) => b.points - a.points || b.wins - a.wins);
  return ranked.map(p => `<li class="standing"><span class="player-dot" style="--c:${p.color}"></span><span class="standing-who"><b>${escapeHtml(p.name)}</b><small>${p.total !== p.points ? `${p.total} cars · ` : ''}${p.wins} ${p.wins === 1 ? 'win' : 'wins'}</small></span><span class="standing-total">${p.points}</span></li>`).join('');
}
function updateGame() {
  $('#board').classList.toggle('is-familiar', (state.spotTaps || 0) >= 3);
  state.players.forEach(p => {
    const score = $(`[data-score="${p.id}"]`);
    if (score) score.textContent = p.tripPoints;
    const detail = $(`[data-detail="${p.id}"]`);
    if (detail) {
      const best = p.bests[p.car] || 0;
      // A best only exists once a trip has been finished with that car, so
      // early on some players have one and others do not; say so plainly.
      const beating = p.carSpots > best && p.carSpots > 0;
      detail.innerHTML = beating ? '<span class="best-flag">★ Best ever!</span>'
        : escapeHtml([p.trip !== p.tripPoints ? `${p.trip} ${p.trip === 1 ? 'car' : 'cars'}` : '', best ? `Best ${best}` : ''].filter(Boolean).join(' · '));
    }
    const minus = $(`[data-minus="${p.id}"]`); if (minus) minus.disabled = !p.trip;
  });
  const lead = leadText();
  $('#live-leader').textContent = lead.title; $('#rail-leader').textContent = lead.title; $('#rail-gap').textContent = lead.detail;
  $('#standings-list').innerHTML = standingsMarkup();
  $('#standings-foot').textContent = `${state.journeys.length} trips recorded · wins awarded at the finish`;

}
function score(id) {
  const event = Game.add(state, id);
  if (!event) return;
  state.spotTaps = (state.spotTaps || 0) + 1;
  save(); updateGame();
  const number = $(`[data-score="${id}"]`);
  if (number) { number.classList.remove('score-bump'); void number.offsetWidth; number.classList.add('score-bump'); }
  const panel = $(`[data-panel="${id}"]`);
  if (panel) { panel.classList.remove('is-hit'); void panel.offsetWidth; panel.classList.add('is-hit'); }
  playerSound(id);
}
function unscore(id, eventId) {
  const event = Game.remove(state, id, eventId);
  if (!event) return;
  save(); updateGame(); blip(240);
}
function startTimer() { clearInterval(timerId); const tick = () => { $('#trip-timer').textContent = fmtDuration(Date.now() - state.tripStart); }; tick(); timerId = setInterval(tick, 1000); }
function endTrip() { if (!state.tripStart) return; clearInterval(timerId); Game.finish(state); showResults(true); save(); }
function showResults(celebrate = false, archive = false) {
  const t = state.lastTrip;
  const winners = t ? t.scores.filter(p => t.winnerIds.includes(p.id)) : [];
  $('#results-kicker').textContent = archive ? 'The family record' : `Trip ${t?.number || state.tripNumber} · ${fmtDuration(t?.duration || 0)}`;
  $('#results-winner').textContent = archive ? 'Our road book' : winners.length > 1 ? 'It’s a tie!' : winners.length ? `${winners[0].name} wins!` : 'A quiet trip';
  $('#result-cards').innerHTML = !archive && t ? t.scores.map(s => `<div class="result-card" style="--c:${s.color}">${carMark(s.car)}<b>${escapeHtml(s.name)}</b><strong>${s.score}</strong>${s.spots != null && s.spots !== s.score ? `<small>${s.spots} ${s.spots === 1 ? 'car' : 'cars'} spotted</small>` : ''}</div>`).join('') : '';
  $('#result-highlights').innerHTML = !archive && t ? (t.highlights || []).filter(h => h.count > 0).map(h => `<div class="record-note"><span class="eyebrow">${h.first ? '★ First record' : '★ Personal best'}</span><span><b>${escapeHtml(h.name)}</b> · ${carLabel(h.car)}</span><strong>${h.count}</strong></div>`).join('') : '';
  $('#btn-new-trip').textContent = archive ? 'Begin trip →' : 'Play again →';
  $('[data-tab="trip"]').hidden = !t;
  $('#screen-results').classList.toggle('archive-view', archive);
  setTab(archive ? 'all' : 'trip'); showScreen('screen-results');
  if (celebrate && winners.length) { runConfetti(); fanfare(); }
}
function setTab(which) {
  currentTab = which;
  const summary = which === 'trip' && !$('#screen-results').classList.contains('archive-view');
  $('.result-celebration').hidden = !summary;
  $('#leaderboard').hidden = summary;
  $$('.tab').forEach(el => { el.classList.toggle('is-active', el.dataset.tab === which); el.setAttribute('aria-pressed', el.dataset.tab === which); });
  const list = $('#leaderboard');
  if (which === 'log') {
    list.innerHTML = [...state.journeys].reverse().map(j => {
      const winners = j.scores.filter(s => j.winnerIds.includes(s.id));
      const title = winners.length > 1 ? `${winners.map(s => s.name).join(' & ')} tied` : winners.length ? `${winners[0].name} won` : 'No spots this time';
      return `<li class="log-row"><span class="eyebrow">Trip ${j.number} · ${new Date(j.endedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${fmtDuration(j.duration)}</span><b>${escapeHtml(title)}</b><small>${j.scores.map(s => `${escapeHtml(s.name)} ${s.score} pts`).join(' · ')}</small></li>`;
    }).join('') || '<li class="lb-empty">Your first trip will be recorded here.</li>';
    return;
  }
  let rows = which === 'trip' && state.lastTrip ? state.lastTrip.scores.map(s => ({ ...s, value: s.score, sub: `${carLabel(s.car)}${s.spots != null && s.spots !== s.score ? ` · ${s.spots} ${s.spots === 1 ? 'car' : 'cars'}` : ''}` })) : state.players.map(p => ({ ...p, value: p.points, sub: `${p.total !== p.points ? `${p.total} cars spotted · ` : ''}${p.wins} ${p.wins === 1 ? 'trip' : 'trips'} won` }));
  rows.sort((a, b) => b.value - a.value);
  list.innerHTML = rows.map((r, i) => `<li class="lb-row"><span class="lb-rank">${rows.findIndex(s => s.value === r.value) + 1}</span><span class="lb-car">${carMark(r.car)}</span><span class="lb-name"><b>${escapeHtml(r.name)}</b><small>${escapeHtml(r.sub)}</small></span><span class="lb-score">${r.value}<small>points</small></span></li>`).join('');
}
function applyTheme() {
  const dark = state.theme === 'dark'; document.documentElement.dataset.theme = state.theme;
  $$('[data-theme-toggle]').forEach(el => { el.setAttribute('aria-label', `Switch to ${dark ? 'day' : 'night'} mode`); });
  $('meta[name="theme-color"]').content = dark ? '#171d1c' : '#eef0e7';
}
function toggleTheme() { state.theme = state.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); }
function soundLabel() {
  const button = $('#btn-sound');
  button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/>${state.sound ? '<path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>' : '<path d="m16 9 5 6m0-6-5 6"/>'}</svg>`;
  button.setAttribute('aria-pressed', state.sound);
  button.setAttribute('aria-label', state.sound ? 'Mute sound' : 'Enable sound');
  button.title = state.sound ? 'Mute sound' : 'Enable sound';
}
// A sound signature follows the player, not their car.
function playerSound(id, preview = false) {
  const p = findPlayer(id);
  const index = Math.max(0, state.players.findIndex(q => q.id === id));
  const sound = SOUNDS[p?.sound ?? index % SOUNDS.length];
  if (sound.slide) { tone(sound.notes[0], { ...sound, to: sound.notes[1], hold: sound.hold }, preview); return; }
  tone(sound.notes[0], sound, preview);
  setTimeout(() => tone(sound.notes[1], sound, preview), sound.gap ?? 95);
}
function blip(freq, preview = false) { tone(freq, { type: 'triangle', hold: .16 }, preview); }
function tone(freq, spec = {}, preview = false) {
  if (!state.sound && !preview) return;
  try { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const t = audioCtx.currentTime, hold = spec.hold ?? .16, peak = spec.gain ?? .07;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = spec.type || 'triangle'; osc.frequency.setValueAtTime(freq, t);
    if (spec.to) osc.frequency.exponentialRampToValueAtTime(spec.to, t + hold);
    gain.gain.setValueAtTime(.001, t); gain.gain.exponentialRampToValueAtTime(peak, t + .012); gain.gain.exponentialRampToValueAtTime(.001, t + hold);
    osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + hold + .02);
  } catch { /* Sound must never block scoring. */ }
}
// The finish line: a short rising fanfare under the confetti.
function fanfare() {
  [523.25, 659.25, 783.99, 1046.5].forEach((note, i) =>
    setTimeout(() => tone(note, { type: 'triangle', hold: i === 3 ? .5 : .18, gain: .06 }), i * 130));
}
async function requestWakeLock() { try { if ('wakeLock' in navigator && !wakeLock) { const lock = await navigator.wakeLock.request('screen'); if (!state.tripStart) { lock.release(); return; } wakeLock = lock; lock.addEventListener('release', () => { wakeLock = null; }); } } catch {} }
function releaseWakeLock() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }
function openModal(title, html, cls = '') {
  if (!$('#modal').hidden) closeModal();
  modalReturnFocus = document.activeElement;
  $('#modal-title').textContent = title; $('#modal-content').innerHTML = html; $('.modal-card').className = `modal-card ${cls}`;
  $('#modal').hidden = false; $$('.screen').forEach(el => el.inert = true); document.body.style.overflow = 'hidden'; $('#modal-close').focus();
}
function closeModal() { $('#modal').hidden = true; $$('.screen').forEach(el => el.inert = false); document.body.style.overflow = ''; if (modalCleanup) { modalCleanup(); modalCleanup = null; } if (modalReturnFocus?.isConnected) modalReturnFocus.focus(); }
function confirmDialog(title, body, onOk, label = 'Finish trip') {
  openModal(title, `<p>${escapeHtml(body)}</p><div class="modal-actions"><button class="btn" id="confirm-cancel">Keep going</button><button class="btn btn-primary" id="confirm-ok">${escapeHtml(label)}</button></div>`);
  $('#confirm-cancel').onclick = closeModal; $('#confirm-ok').onclick = () => { closeModal(); onOk(); };
}
function dismissToast() { clearTimeout(toastTimer); $('#toast').hidden = true; toastAction = null; }
function toast(text, undo = null, duration = 7000) { clearTimeout(toastTimer); $('#toast-text').textContent = text; $('#toast-undo').hidden = !undo; toastAction = undo; $('#toast').hidden = false; if (duration) toastTimer = setTimeout(dismissToast, duration); }
function openGameLeaderboard() {
  openModal('The trip so far', `<h3>${escapeHtml(leadText().title)}</h3><h3 style="margin-top:24px">Overall points</h3><ol class="standings-list">${standingsMarkup()}</ol><p class="hint" style="margin-top:16px">Points include this trip. Wins are awarded when you finish.</p>`);
}
function runConfetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = $('#confetti'), ctx = canvas.getContext('2d'); if (!ctx) return;
  canvas.width = innerWidth; canvas.height = innerHeight;
  const bits = Array.from({ length: 70 }, () => ({ x: Math.random() * canvas.width, y: -Math.random() * canvas.height, vy: 70 + Math.random() * 120, c: COLORS[Math.floor(Math.random() * COLORS.length)], angle: Math.random() * 6 }));
  const start = performance.now(); let last = start;
  function frame(now) { const elapsed = (now - last) / 1000; last = now; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = Math.max(0, 1 - (now - start) / 3000);
    bits.forEach(b => { b.y += b.vy * elapsed; b.angle += elapsed; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle); ctx.fillStyle = b.c; ctx.fillRect(-3, -3, 6, 10); ctx.restore(); });
    if (now - start < 3000 && $('#screen-results').classList.contains('is-active')) requestAnimationFrame(frame); else ctx.clearRect(0, 0, canvas.width, canvas.height);
  } requestAnimationFrame(frame);
}
$$('[data-theme-toggle]').forEach(el => el.onclick = toggleTheme);
$('#btn-add-player').onclick = () => { if (state.players.length >= 6) return; state.players.push(Game.player('', 'fiesta', COLORS[state.players.length % COLORS.length])); save(); renderEditor(); const input = $$('[data-name]').at(-1); input.focus(); input.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
$('#btn-start').onclick = () => startTrip();
$('#btn-edit-setup').onclick = () => { const editor = $('#setup-editor'); editor.hidden = !editor.hidden; $('#btn-edit-setup').textContent = editor.hidden ? 'Edit players' : 'Done editing'; if (editor.hidden) renderEditor(); };
$('#btn-new-trip').onclick = () => startTrip();
$('#btn-edit-players').onclick = () => { $('#setup-editor').hidden = false; $('#btn-edit-setup').textContent = 'Done editing'; renderEditor(); showScreen('screen-setup'); };
$('#btn-view-alltime').onclick = () => showResults(false, true);
$('#btn-end').onclick = endTrip;
$('#btn-sound').onclick = () => { state.sound = !state.sound; save(); soundLabel(); if (state.sound) blip(660); };
$('#btn-game-standings').onclick = openGameLeaderboard;
$('#modal-close').onclick = closeModal;
$('#modal').onclick = e => { if (e.target === $('#modal')) closeModal(); };
$('#toast-undo').onclick = () => { const action = toastAction; dismissToast(); if (action) action(); };
$('#toast-dismiss').onclick = dismissToast;
$$('.tab').forEach(el => el.onclick = () => setTab(el.dataset.tab));
$('#btn-reset-all').onclick = () => confirmDialog('Reset every score?', 'Every score, win, personal best and recorded trip will be erased. Your players and chosen cars stay.', () => {
  state.players.forEach(p => { p.trip = p.total = p.wins = p.points = p.tripPoints = p.carSpots = 0; p.bests = {}; });
  state.tripNumber = 1; state.tripStart = null; state.lastTrip = null; state.journeys = []; state.events = []; state.tripRules = null; save(); renderEditor();
}, 'Reset scores');
document.addEventListener('keydown', e => {
  if ($('#modal').hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
  if (e.key === 'Tab') {
    const items = Array.from($('#modal').querySelectorAll('button:not([disabled]),input,select,a[href]')).filter(el => !el.hidden && el.getClientRects().length);
    const first = items[0], last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.tripStart) requestWakeLock(); });
// Another tab must not silently replace a running game's scores.
window.addEventListener('storage', e => {
  if (e.key !== STORE_KEY) return;
  clearInterval(timerId);
  openModal('This road book changed in another tab', '<p>Reload to use the latest saved scores. Keep one game tab open on this device.</p><div class="modal-actions"><button class="btn btn-primary" id="reload-game">Reload game</button></div>');
  $('#modal-close').hidden = true; $('#reload-game').onclick = () => location.reload();
  modalCleanup = () => { $('#modal-close').hidden = false; location.reload(); };
});
applyTheme(); soundLabel(); renderEditor();
if (state.tripStart) { renderBoard(); showScreen('screen-game'); startTimer(); }
else if (state.lastTrip) showResults();
else showScreen('screen-setup');
if (loadWarning) toast('The saved game could not be read. Your browser copy has not been replaced.', null, 0);
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
