/* Photos stay in this browser. Voice is explicitly enabled for each trip. */
function avatarMark(p) {
  return /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.avatar || '') ? `<img class="avatar" src="${p.avatar}" alt="${escapeHtml(p.name)}">` : '';
}
function editPhoto(id) {
  const p = findPlayer(id);
  openModal(`Photo for ${p.name || 'player'}`, `<p class="hint">Take a photo while parked, or choose one. Photos stay on this device. The Tesla camera may frame only the driver.</p><div class="photo-preview"><video autoplay muted playsinline hidden></video><img alt="Photo preview" hidden></div><p id="photo-status" role="status"></p><div class="photo-actions"><button class="btn" id="photo-camera">Use camera</button><label class="btn">Choose photo<input id="photo-file" type="file" accept="image/*"></label><button class="btn" id="photo-snap" disabled>Take photo</button><button class="btn btn-primary" id="photo-save" disabled>Save photo</button><button class="btn" id="photo-remove">Remove photo</button></div>`);
  const video = $('.photo-preview video'), preview = $('.photo-preview img'), status = $('#photo-status');
  let stream, closed = false, candidate, revision = 0;
  const stop = () => { stream?.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null; };
  modalCleanup = () => { closed = true; revision++; stop(); };
  const capture = source => {
    const width = source.videoWidth || source.naturalWidth, height = source.videoHeight || source.naturalHeight;
    if (!width || !height) throw Error('Image not ready');
    const size = Math.min(width, height), canvas = document.createElement('canvas'); canvas.width = canvas.height = 192;
    canvas.getContext('2d').drawImage(source, (width-size)/2, (height-size)/2, size, size, 0, 0, 192, 192);
    candidate = canvas.toDataURL('image/jpeg', .82); preview.src = candidate; preview.hidden = false; video.hidden = true;
    $('#photo-save').disabled = false; $('#photo-snap').disabled = true; stop(); status.textContent = 'Preview ready. Save it or choose another photo.';
  };
  $('#photo-camera').onclick = async () => {
    const request = ++revision; stop();
    if (!navigator.mediaDevices?.getUserMedia) { status.textContent = 'Camera unavailable in this browser. Try Choose photo.'; return; }
    status.textContent = 'Waiting for camera permission…';
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (closed || request !== revision) { next.getTracks().forEach(t => t.stop()); return; }
      stream = next; video.srcObject = stream; video.hidden = false; preview.hidden = true; await video.play();
      if (closed || request !== revision) return;
      $('#photo-snap').disabled = false; status.textContent = 'Position your face in the centre, then take a photo.';
    } catch (e) { if (!closed && request === revision) { stop(); status.textContent = 'Camera unavailable or permission denied. Park the car and try again, or choose a photo.'; } }
  };
  $('#photo-snap').onclick = () => { try { capture(video); } catch { status.textContent = 'Camera is not ready yet. Try again.'; } };
  $('#photo-file').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    const request = ++revision; stop();
    if (file.size > 20 * 1024 * 1024) { status.textContent = 'Choose an image smaller than 20 MB.'; return; }
    const url = URL.createObjectURL(file), img = new Image();
    try { img.src = url; await img.decode(); if (!closed && request === revision) capture(img); }
    catch { if (!closed) status.textContent = 'Could not read that photo. Try a JPEG or PNG.'; }
    finally { URL.revokeObjectURL(url); }
  };
  $('#photo-save').onclick = () => { if (!candidate) return; p.avatar = candidate; closeModal(); save(); renderEditor(); };
  $('#photo-remove').onclick = () => { delete p.avatar; closeModal(); save(); renderEditor(); };
}
const Voice = (() => {
  let recognizer, enabled = false, restart, last = '', lastAt = 0;
  const normal = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const aliases = { bmw: ['b m w'], volkswagen: ['vw','v w'], 'mercedes-benz': ['mercedes','mercedes benz'], mini: ['mini','minnie'], 'alfa-romeo': ['alfa romeo','alpha romeo'], ds: ['d s'], mg: ['m g'], byd: ['b y d'] };
  const message = text => { const el = document.querySelector('#voice-status'); if (el) el.textContent = text; };
  function stop(text = 'Voice off') {
    enabled = false; clearTimeout(restart); const old = recognizer; recognizer = null; old?.abort();
    const button = document.querySelector('#btn-voice'); if (button) { button.textContent = 'Voice'; button.setAttribute('aria-pressed', 'false'); } message(text);
  }
  function accept(text) {
    const heard = normal(text).replace(/^(spotted|i see|i saw) /, '');
    const matches = state.players.filter(p => {
      const words = [normal(carLabel(p.car)), ...(aliases[p.car] || [])];
      return words.some(word => heard === word || heard === normal(p.name) + ' ' + word);
    });
    if (matches.length !== 1) { message(matches.length ? 'Shared brand: say the player name and brand.' : `Heard “${text}” — say one chosen brand.`); return; }
    const p = matches[0], now = Date.now();
    if (last === p.id && now - lastAt < 1800) { message('Repeat ignored. Pause briefly between sightings.'); return; }
    last = p.id; lastAt = now; score(p.id); message(`${p.name}: ${carLabel(p.car)} +1`);
  }
  function start() {
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) { message('Speech recognition unavailable in this browser. Tap cards to score.'); return; }
    if (!state.tripStart) return;
    enabled = true; last = ''; lastAt = 0;
    const r = recognizer = new API(); r.lang = 'en-GB'; r.continuous = true; r.interimResults = false;
    $('#btn-voice').textContent = 'Stop mic'; $('#btn-voice').setAttribute('aria-pressed', 'true'); message('Connecting to speech recognition…');
    r.onstart = () => { if (enabled && recognizer === r) message('Listening — say a chosen brand'); };
    r.onresult = e => { if (!enabled || recognizer !== r || !state.tripStart) return; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) accept(e.results[i][0].transcript); };
    r.onerror = e => { if (recognizer !== r) return; stop(`Voice stopped: ${e.error}. Tap Voice to retry. Tesla microphone access may not include speech recognition.`); };
    r.onend = () => { if (enabled && recognizer === r && state.tripStart) { restart = setTimeout(() => { if (enabled && recognizer === r) { try { r.start(); } catch { stop('Voice stopped. Tap Voice to retry.'); } } }, 500); } };
    try { r.start(); } catch { stop('Speech recognition could not start. Tap cards to score.'); }
  }
  function toggle() {
    if (enabled) { stop(); return; }
    openModal('Voice scoring · experimental', '<p>Say a chosen brand, such as “Tesla”, to award its player one point. For a shared brand, say the player name first. Use −1 to correct mistakes.</p><p class="hint">Your browser may send audio to its speech recognition provider and require internet access. Spotted does not store recordings. Listening stops when you finish the trip or leave this page.</p><div class="modal-actions"><button class="btn btn-primary" id="voice-enable">Enable microphone</button></div>');
    $('#voice-enable').onclick = () => { closeModal(); start(); };
  }
  return { toggle, stop };
})();
document.addEventListener('visibilitychange', () => { if (document.hidden) Voice.stop(); });
window.addEventListener('pagehide', () => Voice.stop());
