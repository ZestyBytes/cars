/* Spotted: a dependency-free, device-local family road book. */
const STORE_KEY = 'carspotter.v1'; // Keep the original key and migrate in place.
const COLORS = ['#1c6e63', '#a13a2e', '#3f6b2e', '#5b4a9e', '#8a5a12', '#96355a'];
const COLOR_NAMES = ['Teal', 'Terracotta', 'Green', 'Purple', 'Ochre', 'Berry'];
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escapeHtml = str => String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
let loadWarning = false;
let state;
try { state = Game.migrate(JSON.parse(localStorage.getItem(STORE_KEY)), CARS); }
catch { state = Game.fresh(); loadWarning = true; }
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
      ${state.settings.mode === 'rarity' ? `<label class="car-value">Points per spot<input type="number" class="field" min="1" max="5" step="1" data-value-car="${p.car}" value="${state.settings.values[p.car] || CARS[p.car].value}"></label>` : ''}
      <p class="hint">${p.bests[p.car] ? `Best journey: ${p.bests[p.car]} ${carLabel(p.car)} spots` : 'A fresh page for your next adventure.'}</p></div></div></article>`).join('');
  $$('[data-name]').forEach(el => el.oninput = () => { findPlayer(el.dataset.name).name = el.value; save(); });
  $$('[data-pick]').forEach(el => el.onclick = () => openLibrary(el.dataset.pick));
  $$('[data-color]').forEach(el => el.onclick = () => { findPlayer(el.dataset.color).color = el.dataset.value; save(); renderEditor(); });
  $$('[data-value-car]').forEach(el => el.onchange = () => {
    const value = Math.max(1, Math.min(5, Math.floor(Number(el.value)) || 1));
    state.settings.values[el.dataset.valueCar] = value; save(); renderEditor();
  });
  $$('[data-remove]').forEach(el => el.onclick = () => confirmDialog('Remove this player?', 'Their previous journeys stay in the log. Their current overall totals will be removed from the standings.', () => {
    state.players = state.players.filter(p => p.id !== el.dataset.remove); save(); renderEditor();
  }, 'Remove player'));
  $('#btn-add-player').disabled = state.players.length >= 6;
  $('#setting-mode').value = state.settings.mode;
  $('#setting-target').value = state.settings.target;
  $('#setting-team').value = state.settings.teamTarget;
  $('#setting-bonus').checked = state.settings.bonus;
  $('#race-option').hidden = state.settings.mode !== 'race';
  $('#mode-hint').textContent = state.settings.mode === 'rarity' ? 'Choose 1–5 points per model above. These are house rules: agree what is harder to spot on your route. Any colour or generation counts.' : 'Any colour or generation counts. Count each car once. A passenger can keep the score.';
}
function openLibrary(playerId) {
  const p = findPlayer(playerId);
  openModal(`A car for ${p.name || 'your spotter'}`, `<p class="hint">Ten familiar faces for English roads. Any colour or generation of your chosen model counts.</p>
    <div class="library-tools"><input class="field" id="car-search" type="search" placeholder="Find a car…" aria-label="Search car library"><select id="car-filter" aria-label="Filter cars"><option value="">All cars</option><option>Small car</option><option>Hatchback</option><option>SUV</option><option>Saloon</option></select></div>
    <div class="library-grid" id="library-grid"></div><p class="hint library-help">Illustrations show one example of each model. The car’s colour does not affect its points.</p>`, 'library');
  const render = () => {
    const query = $('#car-search').value.toLowerCase().trim();
    const type = $('#car-filter').value;
    const keys = CAR_ORDER.filter(key => CARS[key].label.toLowerCase().includes(query) && (!type || CARS[key].type === type));
    $('#library-grid').innerHTML = keys.length ? keys.map(key => `<button class="library-option" data-library-car="${key}" aria-pressed="${p.car === key}">${carMark(key)}<b>${carLabel(key)}</b><small>${CARS[key].type} · ${state.settings.values[key] || CARS[key].value} rarity pts</small></button>`).join('') : '<p class="hint">No matches. Try a make, like Ford or Tesla.</p>';
    $$('[data-library-car]').forEach(el => el.onclick = () => { p.car = el.dataset.libraryCar; save(); renderEditor(); modalReturnFocus = $(`[data-pick="${p.id}"]`); closeModal(); });
  };
  $('#car-search').oninput = render; $('#car-filter').onchange = render; render();
}
function startTrip(swap = false) {
  if (state.tripStart) return;
  if (swap) Game.swap(state);
  Game.start(state, CARS);
  renderBoard(); showScreen('screen-game'); startTimer(); save();
}
function renderBoard() {
  $('#board').dataset.count = state.players.length;
  $('#board').innerHTML = state.players.map(p => `<article class="panel" style="--c:${p.color}" data-panel="${p.id}">
    <button class="spot-button" data-spot="${p.id}" aria-label="${escapeHtml(p.name)} spotted a ${carLabel(p.car)}">
      <span class="panel-name"><span class="player-dot"></span>${escapeHtml(p.name)}</span><span class="panel-model">${carLabel(p.car)}</span>
      <span class="panel-art">${carMark(p.car)}</span><span class="score-line"><span class="panel-score" data-score="${p.id}">${p.tripPoints}</span><span class="score-unit">points</span></span>
      <span class="spot-label">Spotted! +${state.tripRules.mode === 'rarity' ? state.tripRules.values[p.car] : 1}</span>
    </button><div class="panel-bottom"><span class="panel-detail" data-detail="${p.id}"></span><button class="btn panel-minus" data-minus="${p.id}" aria-label="Undo last sighting for ${escapeHtml(p.name)}">− Undo</button></div></article>`).join('');
  $$('[data-spot]').forEach(el => el.onclick = () => score(el.dataset.spot));
  $$('[data-minus]').forEach(el => el.onclick = () => unscore(el.dataset.minus));
  $('#trip-number').textContent = state.tripNumber;
  $('#game-mode').textContent = state.tripRules.mode === 'race' ? `First to ${state.tripRules.target}` : state.tripRules.mode === 'rarity' ? 'Rarity points' : 'Classic';
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
function teamMarkup() {
  const target = state.tripRules.teamTarget;
  if (!target) return '';
  const spots = state.players.reduce((sum, p) => sum + p.trip, 0);
  return `<div class="team-card"><p class="eyebrow">Better together</p><h3>${spots >= target ? 'Team target reached!' : `Let’s spot ${target}`}</h3><progress max="${target}" value="${Math.min(spots, target)}" aria-label="Team sightings"></progress><small>${spots} / ${target} cars together${spots >= target ? ' · You did it!' : ''}</small></div>`;
}
function standingsMarkup() {
  const ranked = [...state.players].sort((a, b) => b.points - a.points || b.wins - a.wins);
  return ranked.map(p => `<li class="standing"><span class="player-dot" style="--c:${p.color}"></span><span class="standing-who"><b>${escapeHtml(p.name)}</b><small>${p.total} cars · ${p.wins} ${p.wins === 1 ? 'win' : 'wins'}</small></span><span class="standing-total">${p.points}</span></li>`).join('');
}
function updateGame() {
  state.players.forEach(p => {
    const score = $(`[data-score="${p.id}"]`);
    if (score) score.textContent = p.tripPoints;
    const detail = $(`[data-detail="${p.id}"]`);
    if (detail) detail.textContent = `${p.trip} ${p.trip === 1 ? 'car' : 'cars'} · best ${p.bests[p.car] || 0}`;
    const minus = $(`[data-minus="${p.id}"]`); if (minus) minus.disabled = !p.trip;
  });
  const lead = leadText();
  $('#live-leader').textContent = lead.title; $('#rail-leader').textContent = lead.title; $('#rail-gap').textContent = lead.detail;
  $('#rail-team').innerHTML = teamMarkup();
  const target = state.tripRules.teamTarget;
  const spots = state.players.reduce((sum, p) => sum + p.trip, 0);
  $('#compact-team').textContent = target ? `${spots >= target ? '✓ Team target!' : 'Together'} ${spots}/${target} cars` : '';
  $('#standings-list').innerHTML = standingsMarkup();
  $('#standings-foot').textContent = `${state.journeys.length} journeys recorded · wins awarded at the finish`;
  const bonus = state.tripRules.bonusCar;
  $('#btn-bonus').hidden = !bonus;
  $('#btn-bonus').textContent = bonus ? `${carLabel(bonus)} +3` : 'Bonus +3';
  $('#rail-bonus').innerHTML = bonus ? `<div class="bonus-card"><p class="eyebrow">Shared bonus · +3</p><h3>${carLabel(bonus)}</h3><button class="btn" id="rail-claim">We spotted one!</button></div>` : '';
  if ($('#rail-claim')) $('#rail-claim').onclick = openBonus;
}
function score(id, bonus = false) {
  const event = Game.add(state, id, bonus);
  if (!event) return;
  const saved = save(); updateGame();
  const panel = $(`[data-panel="${id}"]`);
  if (panel) { panel.classList.remove('is-hit'); void panel.offsetWidth; panel.classList.add('is-hit'); }
  blip(bonus ? 880 : 660);
  if (Game.raceWon(state)) { endTrip(); return; }
  if (saved) toast(`${findPlayer(id).name}: ${carLabel(event.car)} +${event.points}`, () => unscore(id, event.id));
}
function unscore(id, eventId) {
  const event = Game.remove(state, id, eventId);
  if (!event) return;
  const saved = save(); updateGame(); blip(240);
  if (saved) toast(`${findPlayer(id).name}: ${carLabel(event.car)} removed`, null, 3000);
}
function openBonus() {
  const key = state.tripRules.bonusCar; if (!key) return;
  openModal('Who spotted the bonus?', `<div class="bonus-preview">${carMark(key)}<div><p class="eyebrow">Shared target · +3 points</p><h3>${carLabel(key)}</h3><p class="hint">${CARS[key].hint}</p></div></div><p class="hint">One claim per car. Give the points to whoever spotted it first.</p><div class="claim-buttons">${state.players.map(p => `<button class="btn" style="--c:${p.color}" data-claim="${p.id}">${escapeHtml(p.name)} +3</button>`).join('')}</div>`);
  $$('[data-claim]').forEach(el => el.onclick = () => { closeModal(); score(el.dataset.claim, true); });
}
function startTimer() { clearInterval(timerId); const tick = () => { $('#trip-timer').textContent = fmtDuration(Date.now() - state.tripStart); }; tick(); timerId = setInterval(tick, 1000); }
function endTrip() { if (!state.tripStart) return; clearInterval(timerId); Game.finish(state); showResults(true); save(); }
function showResults(celebrate = false, archive = false) {
  const t = state.lastTrip;
  const winners = t ? t.scores.filter(p => t.winnerIds.includes(p.id)) : [];
  $('#results-kicker').textContent = archive ? 'The family record' : `Journey ${t?.number || state.tripNumber} · ${fmtDuration(t?.duration || 0)}`;
  $('#results-winner').textContent = archive ? 'Our road book' : winners.length > 1 ? 'It’s a tie!' : winners.length ? `${winners[0].name} wins!` : 'A quiet journey';
  const scores = t ? [...t.scores].sort((a, b) => b.score - a.score) : [];
  $('#results-sub').textContent = archive ? `${state.journeys.length} journeys and counting` : scores.length ? `${scores.map(s => s.score).join(' – ')} points${winners.length ? ' · well spotted!' : ' · another adventure awaits'}` : 'Your next adventure starts here.';
  $('#result-cards').innerHTML = !archive && t ? t.scores.map(s => `<div class="result-card" style="--c:${s.color}">${carMark(s.car)}<b>${escapeHtml(s.name)}</b><strong>${s.score}</strong><small>${s.spots ?? s.score} cars spotted</small></div>`).join('') : '';
  const team = t?.rules?.teamTarget;
  const total = t?.scores.reduce((sum, s) => sum + (s.spots ?? s.score), 0) || 0;
  $('#result-highlights').innerHTML = !archive && t ? `${team && total >= team ? `<p>✓ Team challenge complete · ${total} cars together!</p>` : ''}${(t.highlights || []).map(h => `<p>☆ ${escapeHtml(h.name)}${h.first ? '’s first record' : '’s new personal best'}: ${h.count} ${carLabel(h.car)} spots</p>`).join('')}` : '';
  $('#btn-reopen').hidden = archive || !Game.canReopen(state);
  $('#btn-swap').hidden = state.players.length < 2;
  $('#btn-new-trip').textContent = archive ? 'Begin journey →' : 'Play again →';
  $('[data-tab="trip"]').hidden = !t;
  setTab(archive || matchMedia('(min-width:1200px)').matches ? 'all' : 'trip'); showScreen('screen-results');
  if (celebrate && winners.length) runConfetti();
}
function setTab(which) {
  currentTab = which;
  $$('.tab').forEach(el => { el.classList.toggle('is-active', el.dataset.tab === which); el.setAttribute('aria-pressed', el.dataset.tab === which); });
  const list = $('#leaderboard');
  if (which === 'log') {
    list.innerHTML = [...state.journeys].reverse().map(j => {
      const winners = j.scores.filter(s => j.winnerIds.includes(s.id));
      const title = winners.length > 1 ? `${winners.map(s => s.name).join(' & ')} tied` : winners.length ? `${winners[0].name} won` : 'No spots this time';
      return `<li class="log-row"><span class="eyebrow">Journey ${j.number} · ${new Date(j.endedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${fmtDuration(j.duration)}</span><b>${escapeHtml(title)}</b><small>${j.scores.map(s => `${escapeHtml(s.name)} ${s.score} pts`).join(' · ')}</small></li>`;
    }).join('') || '<li class="lb-empty">Your first journey will be recorded here.</li>';
    return;
  }
  let rows = which === 'trip' && state.lastTrip ? state.lastTrip.scores.map(s => ({ ...s, value: s.score, sub: `${carLabel(s.car)} · ${s.spots ?? s.score} cars` })) : state.players.map(p => ({ ...p, value: p.points, sub: `${p.total} cars spotted · ${p.wins} journeys won` }));
  rows.sort((a, b) => b.value - a.value);
  list.innerHTML = rows.map((r, i) => `<li class="lb-row"><span class="lb-rank">${rows.findIndex(s => s.value === r.value) + 1}</span><span class="lb-car">${carMark(r.car)}</span><span class="lb-name"><b>${escapeHtml(r.name)}</b><small>${escapeHtml(r.sub)}</small></span><span class="lb-score">${r.value}<small>points</small></span></li>`).join('');
}
function applyTheme() {
  const dark = state.theme === 'dark'; document.documentElement.dataset.theme = state.theme;
  $$('[data-theme-toggle]').forEach(el => { el.textContent = dark ? 'Day mode' : 'Night mode'; el.setAttribute('aria-label', `Switch to ${dark ? 'day' : 'night'} mode`); });
  $('meta[name="theme-color"]').content = dark ? '#171d1c' : '#eef0e7';
}
function toggleTheme() { state.theme = state.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); }
function soundLabel() { $('#btn-sound').textContent = state.sound ? 'Sound on' : 'Sound off'; $('#btn-sound').setAttribute('aria-pressed', state.sound); }
function blip(freq) {
  if (!state.sound) return;
  try { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(); osc.type = 'triangle'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(.001, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(.07, audioCtx.currentTime + .01); gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + .14);
    osc.connect(gain).connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + .16);
  } catch { /* Sound must never block scoring. */ }
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
function confirmDialog(title, body, onOk, label = 'Finish journey') {
  openModal(title, `<p>${escapeHtml(body)}</p><div class="modal-actions"><button class="btn" id="confirm-cancel">Keep going</button><button class="btn btn-primary" id="confirm-ok">${escapeHtml(label)}</button></div>`);
  $('#confirm-cancel').onclick = closeModal; $('#confirm-ok').onclick = () => { closeModal(); onOk(); };
}
function dismissToast() { clearTimeout(toastTimer); $('#toast').hidden = true; toastAction = null; }
function toast(text, undo = null, duration = 7000) { clearTimeout(toastTimer); $('#toast-text').textContent = text; $('#toast-undo').hidden = !undo; toastAction = undo; $('#toast').hidden = false; if (duration) toastTimer = setTimeout(dismissToast, duration); }
function openGameStandings() {
  openModal('The journey so far', `<h3>${escapeHtml(leadText().title)}</h3>${teamMarkup()}<h3 style="margin-top:24px">Overall points</h3><ol class="standings-list">${standingsMarkup()}</ol><p class="hint" style="margin-top:16px">Points include this journey. Wins are awarded when you finish.</p>`);
}
function openMenu() {
  openModal('Journey menu', `<div class="menu-list"><button class="btn" id="menu-theme">${state.theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}</button><button class="btn" id="menu-rules">Our rules & spotting tips</button><p class="hint" id="offline-status">${navigator.onLine ? 'Connected' : 'Offline'} · scores save on this device</p></div>`);
  $('#menu-theme').onclick = () => { toggleTheme(); $('#menu-theme').textContent = state.theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'; };
  $('#menu-rules').onclick = () => openModal('Our rules', `<p>Any colour or generation of the named model counts. Count each car once, and agree who spotted it first.</p><p class="hint" style="margin:14px 0">${state.tripRules.mode === 'race' ? `First to ${state.tripRules.target} points wins.` : state.tripRules.mode === 'rarity' ? 'Your point values are fixed for this journey.' : 'Each car earns one point.'} ${state.tripRules.bonusCar ? 'A bonus car earns 3 points. Claim it for one player only.' : ''}</p>${state.players.map(p => `<div class="log-row"><b>${escapeHtml(p.name)} · ${carLabel(p.car)}</b><small>${CARS[p.car].hint}</small></div>`).join('')}`);
  if ('caches' in window) caches.match('assets/cars/fiat-500.webp', { cacheName: 'spotted-v9' }).then(ready => { const el = $('#offline-status'); if (el) el.textContent = ready ? 'Ready offline · scores save on this device' : 'Scores save on this device. Offline artwork is still preparing.'; }).catch(() => {});
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
$('#btn-new-trip').onclick = () => startTrip();
$('#btn-swap').onclick = () => startTrip(true);
$('#btn-edit-players').onclick = () => { renderEditor(); showScreen('screen-setup'); };
$('#btn-reopen').onclick = () => { if (Game.reopen(state)) { renderBoard(); showScreen('screen-game'); startTimer(); save(); toast('Journey reopened. You can undo the last sighting.'); } };
$('#btn-view-alltime').onclick = () => showResults(false, true);
$('#btn-end').onclick = () => confirmDialog('Finish this journey?', 'Save the result and celebrate your spots. You can reopen it before starting another journey.', endTrip);
$('#btn-sound').onclick = () => { state.sound = !state.sound; save(); soundLabel(); if (state.sound) blip(660); };
$('#btn-menu').onclick = openMenu;
$('#btn-game-standings').onclick = openGameStandings;
$('#btn-bonus').onclick = openBonus;
$('#modal-close').onclick = closeModal;
$('#modal').onclick = e => { if (e.target === $('#modal')) closeModal(); };
$('#toast-undo').onclick = () => { const action = toastAction; dismissToast(); if (action) action(); };
$('#toast-dismiss').onclick = dismissToast;
$$('.tab').forEach(el => el.onclick = () => setTab(el.dataset.tab));
$('#setting-mode').onchange = e => { state.settings.mode = e.target.value; save(); renderEditor(); };
$('#setting-target').onchange = e => { state.settings.target = Number(e.target.value); save(); };
$('#setting-team').onchange = e => { state.settings.teamTarget = Number(e.target.value); save(); };
$('#setting-bonus').onchange = e => { state.settings.bonus = e.target.checked; save(); };
$('#btn-reset-all').onclick = () => confirmDialog('Reset the whole archive?', 'Every score, win, personal best and recorded journey will be erased. Your players and chosen cars stay.', () => {
  state.players.forEach(p => { p.trip = p.total = p.wins = p.points = p.tripPoints = p.carSpots = 0; p.bests = {}; });
  state.tripNumber = 1; state.tripStart = null; state.lastTrip = null; state.journeys = []; state.events = []; state.tripRules = null; save(); renderEditor();
}, 'Reset archive');
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
