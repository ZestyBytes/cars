/* ==================================================================
   Car Spotter — app logic.
   No dependencies, no build step. State lives in localStorage so the
   game survives a reload, a dropped signal, or the phone locking.
   ================================================================== */

const STORE_KEY = 'carspotter.v1';

/* Enough journeys to cover years of driving, and still a small enough
   record that a browser has no reason to evict it. */
const MAX_JOURNEYS = 500;

/* The archive's per-topic inks: saturated specimen-label colours,
   never pastel chips. */
const COLORS = [
  '#1c6e63', '#a13a2e', '#3f6b2e', '#5b4a9e',
  '#8a5a12', '#96355a', '#8a4a1a',
];

const DEFAULT_STATE = () => ({
  version: 1,
  sound: true,
  theme: 'light',
  tripNumber: 1,
  tripStart: null,
  journeys: [],   // every finished journey, newest last
  players: [
    { id: uid(), name: 'Dad', car: 'model-y', color: '#1c6e63', trip: 0, total: 0, wins: 0 },
    { id: uid(), name: 'Molly', car: 'jazz', color: '#a13a2e', trip: 0, total: 0, wins: 0 },
  ],
  lastTrip: null,
});

function uid() { return Math.random().toString(36).slice(2, 9); }

/* ------------------------------ state ------------------------------ */
let state = load();
let undoStack = [];
let timerId = null;
let wakeLock = null;

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return DEFAULT_STATE();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.players)) return DEFAULT_STATE();
    if (!Array.isArray(parsed.journeys)) parsed.journeys = []; // archives saved before the log existed
    parsed.players.forEach((p) => {
      p.trip = p.trip || 0;
      p.total = p.total || 0;
      p.wins = p.wins || 0;
      if (!CARS[p.car]) p.car = 'model-y';   // archives from before the pair
    });
    return Object.assign(DEFAULT_STATE(), parsed);
  } catch (err) {
    console.warn('Could not read saved game, starting fresh.', err);
    return DEFAULT_STATE();
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('Could not save game.', err);
    // Silently losing a score would be worse than saying so.
    confirmDialog('Could not save',
      'There is no room left in this browser\u2019s storage, so the last score was not recorded.',
      () => {});
    return false;
  }
}

/* ------------------------------ helpers ------------------------------ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showScreen(id) {
  $$('.screen').forEach((s) => s.classList.toggle('is-active', s.id === id));
  if (id === 'screen-game') {
    requestWakeLock();
    // A hidden board measures zero, so the sheets are laid out once shown.
    requestAnimationFrame(layoutPanels);
  } else {
    releaseWakeLock();
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' });
}

function fmtDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/* ------------------------------ setup screen ------------------------------ */
function renderEditor() {
  const wrap = $('#player-editor');
  wrap.innerHTML = state.players.map(playerCard).join('');

  wrap.querySelectorAll('[data-name]').forEach((el) => {
    el.addEventListener('input', () => {
      const p = findPlayer(el.dataset.name);
      p.name = el.value;
      const tag = el.closest('.pcard').querySelector('.mount-tag');
      if (tag) tag.textContent = p.name || 'Unnamed';
      save();
    });
  });

  wrap.querySelectorAll('[data-car]').forEach((el) => {
    el.addEventListener('click', () => {
      const p = findPlayer(el.dataset.car);
      p.car = el.dataset.value;
      save();
      renderEditor();
    });
  });

  wrap.querySelectorAll('[data-color]').forEach((el) => {
    el.addEventListener('click', () => {
      const p = findPlayer(el.dataset.color);
      p.color = el.dataset.value;
      save();
      renderEditor();
    });
  });

  wrap.querySelectorAll('[data-remove]').forEach((el) => {
    el.addEventListener('click', () => {
      state.players = state.players.filter((p) => p.id !== el.dataset.remove);
      save();
      renderEditor();
    });
  });
}

function playerCard(p) {
  const swatches = COLORS.map(
    (c) => `<button class="swatch" style="--sc:${c}" data-color="${p.id}" data-value="${c}"
              aria-pressed="${c === p.color}" aria-label="Colour ${c}" type="button"></button>`
  ).join('');

  const choices = CAR_ORDER.map(
    (key) => `<button class="car-option" data-car="${p.id}" data-value="${key}"
                aria-pressed="${key === p.car}" aria-label="${carLabel(key)}"
                type="button">${carMark(key)}</button>`
  ).join('');

  return `
    <div class="pcard sheet" style="--c:${p.color}" data-card="${p.id}">
      <span class="mount-tag">${escapeHtml(p.name) || 'Unnamed'}</span>
      <div class="pcard-fields">
        <label class="field-label"><span>Player</span>
          <input class="field" data-name="${p.id}" value="${escapeHtml(p.name)}" placeholder="Name" maxlength="18" autocomplete="off"></label>
        <span class="field-label"><span>Looking for</span></span>
        <div class="car-choice">${choices}</div>
        <div class="swatches">${swatches}</div>
        ${state.players.length > 1 ? `<button class="pcard-remove" data-remove="${p.id}" type="button">Remove player</button>` : ''}
      </div>
    </div>`;
}

function findPlayer(id) { return state.players.find((p) => p.id === id); }

function addPlayer() {
  const used = state.players.map((p) => p.color);
  const color = COLORS.find((c) => !used.includes(c)) || COLORS[state.players.length % COLORS.length];
  state.players.push({
    id: uid(), name: '', car: 'model-y', color,
    trip: 0, total: 0, wins: 0,
  });
  save();
  renderEditor();
  const cards = $$('.pcard');
  cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
  cards[cards.length - 1].querySelector('[data-name]').focus();
}

/* ------------------------------ game screen ------------------------------ */
function startTrip() {
  if (state.lastTrip) {
    // The previous journey has been banked — this is the next one.
    state.tripNumber += 1;
    state.lastTrip = null;
  }
  state.players.forEach((p, i) => {
    if (!p.name.trim()) p.name = `Player ${i + 1}`;
    p.trip = 0;
  });
  state.tripStart = Date.now();
  undoStack = [];
  save();
  renderBoard();
  showScreen('screen-game');
  startTimer();
}

function renderBoard() {
  const board = $('#board');
  board.dataset.count = state.players.length;
  board.innerHTML = state.players.map((p) => `
    <div class="panel sheet" style="--c:${p.color}" data-panel="${p.id}" role="button" tabindex="0"
         aria-label="${escapeHtml(p.name)} spotted a ${carLabel(p.car)}">
      <span class="mount-tag">${escapeHtml(p.name)}</span>
      ${carMark(p.car, 'panel-car')}
      <div class="panel-score" data-score="${p.id}">${p.trip}</div>
      <div class="panel-target">
        <span class="panel-total">All-time ${p.total}</span>
        <button class="panel-minus" data-minus="${p.id}" aria-label="Undo one for ${escapeHtml(p.name)}" type="button">−</button>
      </div>
    </div>`).join('');

  $('#trip-number').textContent = state.tripNumber;
  renderStandings();
  layoutPanels();

  board.querySelectorAll('[data-panel]').forEach((el) => {
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-minus]')) return;
      score(el.dataset.panel, e);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); score(el.dataset.panel); }
    });
  });

  board.querySelectorAll('[data-minus]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      unscore(el.dataset.minus);
    });
  });
}

/* The running record, kept in view while playing rather than saved for the
   end: on a tablet in landscape there is room for it beside the board. */
function renderStandings() {
  const list = $('#standings-list');
  if (!list) return;
  const ranked = [...state.players].sort((a, b) => b.total - a.total || b.wins - a.wins);
  list.innerHTML = ranked.map((p, i) => `
    <li class="standing ${i === 0 && p.total > 0 ? 'is-leader' : ''}" style="--c:${p.color}">
      <span class="standing-rank">${i + 1}</span>
      <span class="standing-face">${carMark(p.car, 'standing-mark')}</span>
      <span class="standing-who">
        <b>${escapeHtml(p.name)}</b>
        <small>${p.wins} ${p.wins === 1 ? 'win' : 'wins'}${p.trip ? ` · +${p.trip} today` : ''}</small>
      </span>
      <span class="standing-total">${p.total}</span>
    </li>`).join('');
  const n = state.journeys.length;
  $('#standings-foot').textContent = `${n} ${n === 1 ? 'journey' : 'journeys'} on record`;
}

function layoutPanels() {
  $$('.panel').forEach((el) => {
    const r = el.getBoundingClientRect();
    el.classList.toggle('is-wide', r.width > r.height * 1.05);
  });
}

function score(id, event) {
  const p = findPlayer(id);
  if (!p) return;
  p.trip += 1;
  p.total += 1;
  undoStack.push(id);
  save();
  paintScore(p);
  renderStandings();

  const panel = document.querySelector(`[data-panel="${id}"]`);
  if (panel) {
    panel.classList.remove('is-hit');
    void panel.offsetWidth; // restart the animation
    panel.classList.add('is-hit');
    const rect = panel.getBoundingClientRect();
    const x = event ? event.clientX - rect.left : rect.width / 2;
    const y = event ? event.clientY - rect.top : rect.height / 2;
    spawn(panel, 'ripple', x, y);
    spawn(panel, 'floater', x, y, '+1');
  }

  if (navigator.vibrate) navigator.vibrate(18);
  blip(660);
}

function unscore(id) {
  const p = findPlayer(id);
  if (!p || p.trip <= 0) return;
  p.trip -= 1;
  p.total = Math.max(0, p.total - 1);
  const i = undoStack.lastIndexOf(id);
  if (i > -1) undoStack.splice(i, 1);
  save();
  paintScore(p);
  renderStandings();
  blip(240);
}

function paintScore(p) {
  const el = document.querySelector(`[data-score="${p.id}"]`);
  if (!el) return;
  el.textContent = p.trip;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  const panel = el.closest('.panel');
  const total = panel && panel.querySelector('.panel-total');
  if (total) total.textContent = `All-time ${p.total}`;
}

function spawn(panel, cls, x, y, text) {
  const el = document.createElement('span');
  el.className = cls;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  if (text) el.textContent = text;
  panel.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function startTimer() {
  stopTimer();
  const tick = () => {
    $('#trip-timer').textContent = fmtDuration(Date.now() - (state.tripStart || Date.now()));
  };
  tick();
  timerId = setInterval(tick, 1000);
}
function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }

/* ------------------------------ results ------------------------------ */
function endTrip() {
  stopTimer();
  const ranked = [...state.players].sort((a, b) => b.trip - a.trip);
  const top = ranked[0] ? ranked[0].trip : 0;
  const winners = ranked.filter((p) => p.trip === top && top > 0);

  winners.forEach((w) => { findPlayer(w.id).wins += 1; });

  state.lastTrip = {
    number: state.tripNumber,
    duration: state.tripStart ? Date.now() - state.tripStart : 0,
    endedAt: Date.now(),
    scores: state.players.map((p) => ({
      id: p.id, name: p.name, car: p.car, color: p.color, score: p.trip,
    })),
    winnerIds: winners.map((w) => w.id),
  };
  state.journeys.push(state.lastTrip);
  if (state.journeys.length > MAX_JOURNEYS) state.journeys = state.journeys.slice(-MAX_JOURNEYS);
  state.tripStart = null;
  save();

  showResults();
}

function showResults() {
  const t = state.lastTrip;
  const kicker = $('#results-kicker');
  const winner = $('#results-winner');
  const sub = $('#results-sub');

  if (!t || !t.winnerIds.length) {
    kicker.textContent = 'Journey complete';
    winner.textContent = 'No spots!';
    sub.textContent = 'Nobody saw a thing. Next time.';
  } else if (t.winnerIds.length > 1) {
    const names = t.scores.filter((s) => t.winnerIds.includes(s.id)).map((s) => s.name);
    kicker.textContent = `Journey No. ${t.number} · ${fmtDuration(t.duration)}`;
    winner.textContent = "It's a tie!";
    sub.textContent = `${names.join(' & ')} — ${Math.max(...t.scores.map((s) => s.score))} each`;
  } else {
    const w = t.scores.find((s) => s.id === t.winnerIds[0]);
    kicker.textContent = `Journey No. ${t.number} · ${fmtDuration(t.duration)}`;
    winner.textContent = `${w.name} wins!`;
    sub.textContent = `${w.score} × ${carLabel(w.car)}`;
  }

  setTab('trip');
  showScreen('screen-results');
  runConfetti();
}

function setTab(which) {
  $$('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === which));
  renderLeaderboard(which);
}

function renderLeaderboard(which) {
  const list = $('#leaderboard');
  let rows;

  if (which === 'log') {
    renderJourneyLog(list);
    return;
  }

  if (which === 'trip') {
    const t = state.lastTrip;
    const scores = t ? [...t.scores] : state.players.map((p) => ({ ...p, score: p.trip }));
    rows = scores.sort((a, b) => b.score - a.score).map((s) => ({
      name: s.name, sub: carLabel(s.car), color: s.color, car: s.car, value: s.score,
    }));
  } else {
    rows = [...state.players].sort((a, b) => b.total - a.total).map((p) => ({
      name: p.name,
      sub: `${carLabel(p.car)} · ${p.wins} ${p.wins === 1 ? 'journey' : 'journeys'} won`,
      color: p.color, car: p.car, value: p.total,
    }));
  }

  list.innerHTML = rows.map((r, i) => `
    <li class="lb-row ${i === 0 ? 'is-first' : ''}" style="--c:${r.color}">
      <span class="lb-rank">${i === 0 ? '1st' : `${i + 1}${['th', 'st', 'nd', 'rd'][(i + 1) % 10] || 'th'}`}</span>
      <span class="lb-car">${carMark(r.car, 'lb-mark')}</span>
      <span class="lb-name"><b>${escapeHtml(r.name)}</b><small>${escapeHtml(r.sub)}</small></span>
      <span class="lb-score">${r.value}</span>
    </li>`).join('');
}

/* Past journeys, newest first: the point of keeping the log is being
   able to say "you won that one on the way to Grandma's". */
function renderJourneyLog(list) {
  const journeys = [...state.journeys].reverse();
  if (!journeys.length) {
    list.innerHTML = '<li class="lb-empty">No journeys recorded yet.</li>';
    return;
  }
  list.innerHTML = journeys.map((j) => {
    const ranked = [...j.scores].sort((a, b) => b.score - a.score);
    const winners = j.scores.filter((sc) => j.winnerIds.includes(sc.id));
    const won = winners.length > 1 ? 'Tied' : winners.length ? winners[0].name : 'No spots';
    const colour = winners.length === 1 ? winners[0].color : 'var(--line)';
    const tally = ranked.map((sc) => `${escapeHtml(sc.name)} ${sc.score}`).join(' · ');
    return `
      <li class="log-row" style="--c:${colour}">
        <span class="log-date">${fmtDate(j.endedAt)}</span>
        <span class="log-body">
          <b>${escapeHtml(won)}${winners.length ? ' won' : ''}</b>
          <small>${tally}</small>
        </span>
        <span class="log-meta">No. ${j.number}<i>${fmtDuration(j.duration)}</i></span>
      </li>`;
  }).join('');
}

/* ------------------------------ confetti ------------------------------ */
function runConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = $('#confetti');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const palette = state.players.map((p) => p.color).concat(['#a13a2e', '#3f6b2e', '#8a5a12']);
  const bits = Array.from({ length: 120 }, () => ({
    x: Math.random() * w,
    y: -Math.random() * h * 0.6,
    vx: (Math.random() - 0.5) * 1.6,
    vy: 2 + Math.random() * 3.4,
    size: 5 + Math.random() * 7,
    rot: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.28,
    color: palette[Math.floor(Math.random() * palette.length)],
  }));

  const started = performance.now();
  (function frame(now) {
    ctx.clearRect(0, 0, w, h);
    const life = now - started;
    bits.forEach((b) => {
      b.x += b.vx;
      b.y += b.vy;
      b.rot += b.spin;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.globalAlpha = Math.max(0, 1 - life / 4200);
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size * 0.6);
      ctx.restore();
    });
    if (life < 4200 && $('#screen-results').classList.contains('is-active')) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
  })(started);
}

/* ------------------------------ sound ------------------------------ */
let audioCtx = null;
function blip(freq) {
  if (!state.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (err) { /* audio is a nicety, never a blocker */ }
}

/* ------------------------------ archive ------------------------------ */
/* localStorage can be evicted; a granted persistence request means the
   browser keeps the archive until it is deleted deliberately. */
function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

/* ------------------------------ theme ------------------------------ */
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const btn = $('#btn-theme');
  const dark = state.theme === 'dark';
  btn.setAttribute('aria-label', dark ? 'Switch to the light setting' : 'Switch to the dark setting');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#14160f' : '#eef0e7');
}

/* ------------------------------ wake lock ------------------------------ */
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (err) { /* unsupported or denied — fine */ }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && $('#screen-game').classList.contains('is-active')) requestWakeLock();
});

/* ------------------------------ modal ------------------------------ */
function confirmDialog(title, body, onOk) {
  $('#modal-title').textContent = title;
  $('#modal-body').textContent = body;
  $('#modal').hidden = false;
  const ok = $('#modal-ok');
  const cancel = $('#modal-cancel');
  const close = () => {
    $('#modal').hidden = true;
    ok.removeEventListener('click', accept);
    cancel.removeEventListener('click', close);
  };
  const accept = () => { close(); onOk(); };
  ok.addEventListener('click', accept);
  cancel.addEventListener('click', close);
}

/* ------------------------------ wiring ------------------------------ */
$('#btn-theme').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  save();
  applyTheme();
});

$('#btn-add-player').addEventListener('click', addPlayer);
$('#btn-start').addEventListener('click', startTrip);

$('#btn-view-alltime').addEventListener('click', () => {
  $('#results-kicker').textContent = 'Standings';
  $('#results-winner').textContent = 'All-time';
  const n = state.journeys.length;
  $('#results-sub').textContent = `${n} ${n === 1 ? 'journey' : 'journeys'} on record`;
  setTab('all');
  showScreen('screen-results');
});

$('#btn-end').addEventListener('click', () => {
  confirmDialog('End this journey?', 'Trip scores get locked in and the all-time totals are kept.', endTrip);
});

$('#btn-sound').addEventListener('click', () => {
  state.sound = !state.sound;
  save();
  const btn = $('#btn-sound');
  btn.textContent = state.sound ? '\u266a' : '\u266a\u0338';
  btn.classList.toggle('is-off', !state.sound);
  if (state.sound) blip(660);
});

$$('.tab').forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));

$('#btn-new-trip').addEventListener('click', startTrip);

$('#btn-edit-players').addEventListener('click', () => {
  renderEditor();
  showScreen('screen-setup');
});

$('#btn-reset-all').addEventListener('click', () => {
  confirmDialog('Reset the whole archive?', 'Every score, win and recorded journey is erased. The players stay.', () => {
    state.players.forEach((p) => { p.trip = 0; p.total = 0; p.wins = 0; });
    state.tripNumber = 1;
    state.tripStart = null;
    state.lastTrip = null;
    state.journeys = [];
    undoStack = [];
    save();
    renderEditor();
  });
});

/* ------------------------------ boot ------------------------------ */
(function boot() {
  applyTheme();
  requestPersistence();

  const soundBtn = $('#btn-sound');
  soundBtn.textContent = state.sound ? '\u266a' : '\u266a\u0338';
  soundBtn.classList.toggle('is-off', !state.sound);

  renderEditor();

  if (state.tripStart) {
    // A journey was in progress when the app was closed — pick it back up.
    renderBoard();
    showScreen('screen-game');
    startTimer();
  } else {
    showScreen('screen-setup');
  }

  window.addEventListener('orientationchange', () => setTimeout(layoutPanels, 250));
  window.addEventListener('resize', () => {
    layoutPanels();
    if ($('#screen-results').classList.contains('is-active')) {
      const c = $('#confetti');
      c.width = c.clientWidth;
      c.height = c.clientHeight;
    }
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
