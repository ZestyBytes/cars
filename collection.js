function openCollection() {
  const counts = state.brandCounts || {};
  const total = CAR_ORDER.reduce((n,k)=>n+(counts[k] || 0),0), unlocked = CAR_ORDER.filter(k=>counts[k]>0).length;
  openModal('Your brand collection', `<p><strong>${unlocked} / ${CAR_ORDER.length} brands</strong> · ${total} recorded sightings</p><p class="hint">Your recorded brand sightings. Older trips are included where brand details survive; this may be fewer than lifetime player totals.</p><input id="collection-search" class="field" type="search" placeholder="Find a brand" aria-label="Search collection"><div id="collection-grid" class="library-grid"></div>`, 'library');
  const render = () => {
    const q = $('#collection-search').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    $('#collection-grid').innerHTML = CAR_ORDER.filter(k=>carLabel(k).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q)).map(k=>`<article class="collection-tile ${counts[k] ? '' : 'unspotted'}">${carMark(k)}<strong>${carLabel(k)}</strong><span>${counts[k] || 0} sightings</span></article>`).join('');
  }; $('#collection-search').oninput = render; render();
}
