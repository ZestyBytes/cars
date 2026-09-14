const BINGO_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function bingoLines() { return BINGO_LINES.filter(line => line.every(i => state.bingo.found.includes(state.bingo.keys[i]))).length; }
function startBingo() {
  // Everyday brands keep a nine-square board achievable on a family journey.
  const pool = ['tesla','honda','ford','vauxhall','volkswagen','mini','nissan','kia','fiat','bmw','audi','toyota','hyundai','peugeot','renault','skoda','mercedes-benz','volvo','seat','suzuki','mazda'];
  for (let i = pool.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  state.lastTrip = null; state.events = [];
  state.bingo = { keys: pool.slice(0,9), found: [] }; state.tripStart = Date.now(); state.brandCounts ||= {};
  Voice.stop(); renderBoard(); showScreen('screen-game'); startTimer(); save();
}
function renderBingo() {
  $('.play').classList.add('bingo-play'); $('#board').classList.add('bingo-board');
  $('#btn-voice').hidden = true; $('#btn-game-standings').hidden = true;
  $('#voice-status').textContent = 'Team bingo · tap a brand once when spotted. Tap a marked tile to undo.';
  $('#trip-number').textContent = state.tripNumber;
  $('#board').innerHTML = state.bingo.keys.map(key => `<button class="bingo-tile" data-bingo="${key}" aria-pressed="${state.bingo.found.includes(key)}">${carMark(key)}<strong>${carLabel(key)}</strong><span>${state.bingo.found.includes(key) ? '✓ Spotted' : 'Spot me'}</span></button>`).join('');
  $('#live-leader').textContent = `${state.bingo.found.length}/9 found · ${bingoLines()} lines`;
  $$('[data-bingo]').forEach(el => el.onclick = () => {
    const key = el.dataset.bingo;
    if (state.bingo.found.includes(key)) {
      confirmDialog('Undo this spot?', `Remove ${carLabel(key)} from this board and your collection count?`, () => {
        state.bingo.found = state.bingo.found.filter(k => k !== key); state.brandCounts[key] = Math.max(0,(state.brandCounts[key] || 0)-1); save(); renderBingo();
      }, 'Undo spot'); return;
    }
    const before = bingoLines(); state.bingo.found.push(key); state.brandCounts[key] = (state.brandCounts[key] || 0)+1; save(); renderBingo();
    if (state.bingo.found.length === 9) { toast('Full house! You found all nine brands. Finish to save your team result.', null, 10000); }
    else if (bingoLines() > before) toast('Bingo! You completed a line together.');
    const tile = $(`[data-bingo="${key}"]`); tile.classList.add('bingo-hit');
  });
}
function finishBingo() {
  clearInterval(timerId);
  const record = { endedAt: Date.now(), duration: Date.now()-state.tripStart, found: [...state.bingo.found], lines: bingoLines() };
  state.bingoHistory ||= []; state.bingoHistory.push(record); state.bingoHistory = state.bingoHistory.slice(-100);
  state.bingo = null; state.tripStart = null; save(); renderEditor(); showScreen('screen-setup');
  openModal(record.found.length === 9 ? 'Full house! Teamwork wins.' : 'Your team bingo result', `<p class="bingo-result">${record.found.length} / 9 brands</p><p>${record.lines} completed lines · ${fmtDuration(record.duration)}</p><p class="hint">Your finds have been added to Collection. Play again for a fresh board.</p><div class="modal-actions"><button class="btn" id="bingo-again">Another bingo board</button><button class="btn btn-primary" id="bingo-new">New game →</button></div>`);
  $('#bingo-new').onclick = () => { closeModal(); newGameSetup(); };
  $('#bingo-again').onclick = () => { closeModal(); startBingo(); };
}
function openCollection() {
  const counts = state.brandCounts || {};
  const total = CAR_ORDER.reduce((n,k)=>n+(counts[k] || 0),0), unlocked = CAR_ORDER.filter(k=>counts[k]>0).length;
  openModal('Your brand collection', `<p><strong>${unlocked} / ${CAR_ORDER.length} brands</strong> · ${total} recorded sightings</p><p class="hint">Classic and team bingo finds count together. Older trips are included where brand details survive; this may be fewer than lifetime player totals.</p><input id="collection-search" class="field" type="search" placeholder="Find a brand" aria-label="Search collection"><div id="collection-grid" class="library-grid"></div><h3 class="bingo-history-heading">Recent team bingo</h3>${(state.bingoHistory || []).slice(-5).reverse().map(r=>`<p>${new Date(r.endedAt).toLocaleDateString()} · ${r.found.length}/9 brands · ${r.lines} lines</p>`).join('') || '<p class="hint">Your first board awaits.</p>'}`, 'library');
  const render = () => {
    const q = $('#collection-search').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    $('#collection-grid').innerHTML = CAR_ORDER.filter(k=>carLabel(k).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q)).map(k=>`<article class="collection-tile ${counts[k] ? '' : 'unspotted'}">${carMark(k)}<strong>${carLabel(k)}</strong><span>${counts[k] || 0} sightings</span></article>`).join('');
  }; $('#collection-search').oninput = render; render();
}
