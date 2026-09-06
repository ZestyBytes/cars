/* ==================================================================
   Car Spotter — app logic.
   No dependencies, no build step. State lives in localStorage so the
   game survives a reload, a dropped signal, or the phone locking.
   ================================================================== */

const STORE_KEY = 'carspotter.v1';

const COLORS = [
  '#ff4d6d', '#4ea8ff', '#3ddc97', '#ffb020',
  '#c77dff', '#ff7a45', '#26d0ce', '#f2f4f8',
];

const DEFAULT_STATE = () => ({
  version: 1,
  sound: true,
  tripNumber: 1,
  tripStart: null,
  players: [
    { id: uid(), name: 'Dad', car: 'Tesla', shape: 'ev', color: '#4ea8ff', trip: 0, total: 0, wins: 0 },
    { id: uid(), name: 'Daughter', car: 'Honda Jazz', shape: 'hatch', color: '#ff4d6d', trip: 0, total: 0, wins: 0 },
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
    parsed.players.forEach((p) => {
      p.trip = p.trip || 0;
      p.total = p.total || 0;
      p.wins = p.wins || 0;
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
  } catch (err) {
    console.warn('Could not save game.', err);
  }
}

/* ------------------------------ helpers ------------------------------ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showScreen(id) {
  $$('.screen').forEach((s) => s.classList.toggle('is-active', s.id === id));
  if (id === 'screen-game') requestWakeLock(); else releaseWakeLock();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
      findPlayer(el.dataset.name).name = el.value;
      save();
    });
  });

  wrap.querySelectorAll('[data-car]').forEach((el) => {
    el.addEventListener('input', () => {
      const p = findPlayer(el.dataset.car);
      p.car = el.value;
      const guess = guessShape(el.value);
      if (guess && !p.shapeLocked) {
        p.shape = guess;
        refreshCardArt(p);
      }
      save();
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

  wrap.querySelectorAll('[data-pick]').forEach((el) => {
    el.addEventListener('click', () => openShapePicker(el.dataset.pick));
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

  return `
    <div class="pcard" style="--c:${p.color}" data-card="${p.id}">
      ${state.players.length > 1 ? `<button class="pcard-remove" data-remove="${p.id}" aria-label="Remove ${escapeHtml(p.name)}" type="button">✕</button>` : ''}
      <button class="pcard-preview" data-pick="${p.id}" type="button" aria-label="Change car shape for ${escapeHtml(p.name)}">
        <span data-preview="${p.id}">${carSvg(p.shape)}</span>
        <small>change</small>
      </button>
      <div class="pcard-fields">
        <input class="field" data-name="${p.id}" value="${escapeHtml(p.name)}" placeholder="Name" maxlength="18" autocomplete="off">
        <input class="field" data-car="${p.id}" value="${escapeHtml(p.car)}" placeholder="Car they're hunting" maxlength="24" autocomplete="off">
        <div class="swatches">${swatches}</div>
      </div>
    </div>`;
}

function refreshCardArt(p) {
  const preview = document.querySelector(`[data-preview="${p.id}"]`);
  if (preview) preview.innerHTML = carSvg(p.shape);
}

/* The shape picker is a sheet rather than an inline grid — fifteen
   silhouettes per player would swamp the setup screen on a phone. */
function openShapePicker(playerId) {
  const p = findPlayer(playerId);
  if (!p) return;
  const grid = $('#shape-grid');
  const modal = $('#shape-modal');
  modal.style.setProperty('--c', p.color);
  grid.innerHTML = CAR_ORDER.map(
    (key) => `<button class="shape-btn" data-value="${key}" aria-pressed="${key === p.shape}"
                title="${CAR_SHAPES[key].label}" aria-label="${CAR_SHAPES[key].label}"
                type="button">${carSvg(key)}<small>${CAR_SHAPES[key].label}</small></button>`
  ).join('');
  grid.querySelectorAll('.shape-btn').forEach((b) => {
    b.addEventListener('click', () => {
      p.shape = b.dataset.value;
      p.shapeLocked = true; // stop the keyword guesser overriding a manual pick
      save();
      refreshCardArt(p);
      grid.querySelectorAll('.shape-btn').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    });
  });
  modal.hidden = false;
}

function findPlayer(id) { return state.players.find((p) => p.id === id); }

function addPlayer() {
  const used = state.players.map((p) => p.color);
  const color = COLORS.find((c) => !used.includes(c)) || COLORS[state.players.length % COLORS.length];
  state.players.push({
    id: uid(), name: '', car: '', shape: 'suv', color,
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
    if (!p.car.trim()) p.car = CAR_SHAPES[p.shape].label;
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
    <div class="panel" style="--c:${p.color}" data-panel="${p.id}" role="button" tabindex="0"
         aria-label="${escapeHtml(p.name)} spotted a ${escapeHtml(p.car)}">
      <div class="panel-name">${escapeHtml(p.name)}</div>
      ${carSvg(p.shape, 'panel-car')}
      <div class="panel-score" data-score="${p.id}">${p.trip}</div>
      <div class="panel-target">
        <span>${escapeHtml(p.car)}</span>
        <span class="panel-total">all-time ${p.total}</span>
      </div>
      <button class="panel-minus" data-minus="${p.id}" aria-label="Undo one for ${escapeHtml(p.name)}" type="button">−</button>
    </div>`).join('');

  $('#trip-number').textContent = state.tripNumber;

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

function score(id, event) {
  const p = findPlayer(id);
  if (!p) return;
  p.trip += 1;
  p.total += 1;
  undoStack.push(id);
  save();
  paintScore(p);

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
  blip(240);
}

function undoLast() {
  const id = undoStack[undoStack.length - 1];
  if (id) unscore(id);
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
  if (total) total.textContent = `all-time ${p.total}`;
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
    scores: state.players.map((p) => ({ id: p.id, name: p.name, car: p.car, shape: p.shape, color: p.color, score: p.trip })),
    winnerIds: winners.map((w) => w.id),
  };
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
    kicker.textContent = `Journey ${t.number} · ${fmtDuration(t.duration)}`;
    winner.textContent = "It's a tie!";
    sub.textContent = `${names.join(' & ')} — ${Math.max(...t.scores.map((s) => s.score))} each`;
  } else {
    const w = t.scores.find((s) => s.id === t.winnerIds[0]);
    kicker.textContent = `Journey ${t.number} · ${fmtDuration(t.duration)}`;
    winner.textContent = `${w.name} wins!`;
    sub.textContent = `${w.score} × ${w.car}`;
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

  if (which === 'trip') {
    const t = state.lastTrip;
    const scores = t ? [...t.scores] : state.players.map((p) => ({ ...p, score: p.trip }));
    rows = scores.sort((a, b) => b.score - a.score).map((s) => ({
      name: s.name, sub: s.car, color: s.color, shape: s.shape, value: s.score,
    }));
  } else {
    rows = [...state.players].sort((a, b) => b.total - a.total).map((p) => ({
      name: p.name,
      sub: `${p.car} · ${p.wins} ${p.wins === 1 ? 'journey' : 'journeys'} won`,
      color: p.color, shape: p.shape, value: p.total,
    }));
  }

  list.innerHTML = rows.map((r, i) => `
    <li class="lb-row ${i === 0 ? 'is-first' : ''}" style="--c:${r.color}">
      <span class="lb-rank">${i === 0 ? '🏆' : i + 1}</span>
      <span class="lb-car">${carSvg(r.shape)}</span>
      <span class="lb-name">${escapeHtml(r.name)}<small>${escapeHtml(r.sub)}</small></span>
      <span class="lb-score">${r.value}</span>
    </li>`).join('');
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

  const palette = state.players.map((p) => p.color).concat(['#f6c445', '#ffffff']);
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
$('#shape-close').addEventListener('click', () => { $('#shape-modal').hidden = true; });
$('#shape-modal').addEventListener('click', (e) => {
  if (e.target.id === 'shape-modal') e.currentTarget.hidden = true;
});

$('#btn-add-player').addEventListener('click', addPlayer);
$('#btn-start').addEventListener('click', startTrip);

$('#btn-view-alltime').addEventListener('click', () => {
  $('#results-kicker').textContent = 'Standings';
  $('#results-winner').textContent = 'All-time';
  $('#results-sub').textContent = `${state.tripNumber - 1} ${state.tripNumber - 1 === 1 ? 'journey' : 'journeys'} played`;
  setTab('all');
  showScreen('screen-results');
});

$('#btn-end').addEventListener('click', () => {
  confirmDialog('End this journey?', 'Trip scores get locked in and the all-time totals are kept.', endTrip);
});

$('#btn-undo').addEventListener('click', undoLast);

$('#btn-sound').addEventListener('click', () => {
  state.sound = !state.sound;
  save();
  const btn = $('#btn-sound');
  btn.textContent = state.sound ? '🔊' : '🔇';
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
  confirmDialog('Reset everything?', 'Every score, journey win and journey count goes back to zero. Players are kept.', () => {
    state.players.forEach((p) => { p.trip = 0; p.total = 0; p.wins = 0; });
    state.tripNumber = 1;
    state.tripStart = null;
    state.lastTrip = null;
    undoStack = [];
    save();
    renderEditor();
  });
});

/* ------------------------------ boot ------------------------------ */
(function boot() {
  const soundBtn = $('#btn-sound');
  soundBtn.textContent = state.sound ? '🔊' : '🔇';
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

  window.addEventListener('resize', () => {
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
