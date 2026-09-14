/* Uploaded avatars stay in this browser. */
function avatarMark(p) {
  return /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.avatar || '') ? `<img class="avatar" src="${p.avatar}" alt="${escapeHtml(p.name)}">` : '';
}
function editPhoto(id) {
  const p = findPlayer(id);
  openModal(`Photo for ${p.name || 'player'}`, `<p class="hint">Choose an existing photo for your avatar. Photos stay in this browser on this device.</p><div class="photo-preview"><img alt="Photo preview" hidden></div><p id="photo-status" role="status"></p><div class="photo-actions"><label class="btn">Choose photo<input id="photo-file" type="file" accept="image/*"></label><button class="btn btn-primary" id="photo-save" disabled>Save photo</button><button class="btn" id="photo-remove">Remove photo</button></div>`);
  const preview = $('.photo-preview img'), status = $('#photo-status');
  let closed = false, candidate, revision = 0;
  modalCleanup = () => { closed = true; revision++; };
  const capture = source => {
    const width = source.naturalWidth, height = source.naturalHeight;
    if (!width || !height) throw Error('Image not ready');
    const size = Math.min(width, height), canvas = document.createElement('canvas'); canvas.width = canvas.height = 192;
    canvas.getContext('2d').drawImage(source, (width-size)/2, (height-size)/2, size, size, 0, 0, 192, 192);
    candidate = canvas.toDataURL('image/jpeg', .82); preview.src = candidate; preview.hidden = false;
    $('#photo-save').disabled = false; status.textContent = 'Preview ready. Save it or choose another photo.';
  };
  $('#photo-file').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    const request = ++revision;
    if (file.size > 20 * 1024 * 1024) { status.textContent = 'Choose an image smaller than 20 MB.'; return; }
    const url = URL.createObjectURL(file), img = new Image();
    try { img.src = url; await img.decode(); if (!closed && request === revision) capture(img); }
    catch { if (!closed) status.textContent = 'Could not read that photo. Try a JPEG or PNG.'; }
    finally { URL.revokeObjectURL(url); }
  };
  $('#photo-save').onclick = () => { if (!candidate) return; p.avatar = candidate; closeModal(); save(); renderEditor(); };
  $('#photo-remove').onclick = () => { delete p.avatar; closeModal(); save(); renderEditor(); };
}
