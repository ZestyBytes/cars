/* ------------------------------------------------------------------
   avatars.js — who is spotting, as opposed to what they are spotting.
   A portrait is one of three things: an uploaded photograph, a drawn
   character outline, or the spotter's initials. Outlines are stroked
   line art in a 0 0 48 48 box, matching the trophy stamp.
   ------------------------------------------------------------------ */

const FIGURE_SHAPES = {
  adult: {
    label: 'Grown-up',
    svg: '<circle cx="24" cy="17" r="8"/><path d="M8 41c0-8.5 7.2-13.5 16-13.5S40 32.5 40 41"/>',
  },
  child: {
    label: 'Child',
    svg: '<circle cx="24" cy="18" r="6.5"/><path d="M24 11.5V7"/><path d="M12 41c0-7 5.4-11 12-11s12 4 12 11"/>',
  },
  cap: {
    label: 'Cap',
    svg: '<circle cx="24" cy="18" r="7.5"/><path d="M15.5 15a8.5 8.5 0 0 1 17 0z"/><path d="M32.5 15H40"/><path d="M9 41c0-8 6.7-12.5 15-12.5S39 33 39 41"/>',
  },
  long: {
    label: 'Long hair',
    svg: '<circle cx="24" cy="17" r="7.5"/><path d="M14 15v14M34 15v14"/><path d="M9 41c0-8 6.7-12.5 15-12.5S39 33 39 41"/>',
  },
  glasses: {
    label: 'Glasses',
    svg: '<circle cx="24" cy="17" r="8"/><circle cx="20.5" cy="16.5" r="2.6"/><circle cx="27.5" cy="16.5" r="2.6"/><path d="M23.1 16.5h1.8"/><path d="M8 41c0-8.5 7.2-13.5 16-13.5S40 32.5 40 41"/>',
  },
  beard: {
    label: 'Beard',
    svg: '<circle cx="24" cy="16" r="7.5"/><path d="M17 19c0 6.5 3 10 7 10s7-3.5 7-10"/><path d="M9 41c0-8 6.7-12.5 15-12.5S39 33 39 41"/>',
  },
  dog: {
    label: 'Dog',
    svg: '<path d="M13 14c-2-5-1-7 1-6.5L20 11"/><path d="M35 14c2-5 1-7-1-6.5L28 11"/><path d="M12 22a12 12 0 0 1 24 0c0 8-5.4 14-12 14s-12-6-12-14z"/><circle cx="20" cy="21" r="1.6"/><circle cx="28" cy="21" r="1.6"/><path d="M24 26v2M21 30h6"/>',
  },
  cat: {
    label: 'Cat',
    svg: '<path d="M13 20l-1.5-10L20 15M35 20l1.5-10L28 15"/><path d="M12 24a12 12 0 0 1 24 0c0 7-5.4 12-12 12s-12-5-12-12z"/><circle cx="19.5" cy="23" r="1.6"/><circle cx="28.5" cy="23" r="1.6"/><path d="M24 27v1.5M8 26h6M34 26h6M8 30h6M34 30h6"/>',
  },
};

const FIGURE_ORDER = ['adult', 'child', 'cap', 'long', 'glasses', 'beard', 'dog', 'cat'];

function figureSvg(key) {
  const f = FIGURE_SHAPES[key] || FIGURE_SHAPES.adult;
  return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${f.svg}</svg>`;
}

/* Initials from whatever the spotter typed: "Dad" -> DA, "Ruby May" -> RM. */
function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* A photograph is only ever a data URL this app produced itself. */
function isPhoto(value) {
  return typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

/* One portrait plate, sized by the caller's class. */
function portraitHtml(p, cls = '') {
  if (p.portrait === 'photo') {
    // A journey recorded long ago names a photograph it does not carry;
    // if the spotter is gone, their initials stand in for the face.
    return isPhoto(p.photo)
      ? `<span class="portrait portrait-photo ${cls}" style="background-image:url('${p.photo}')" aria-hidden="true"></span>`
      : `<span class="portrait portrait-initials ${cls}" aria-hidden="true">${initialsOf(p.name)}</span>`;
  }
  if (p.portrait === 'initials') {
    return `<span class="portrait portrait-initials ${cls}" aria-hidden="true">${initialsOf(p.name)}</span>`;
  }
  return `<span class="portrait portrait-figure ${cls}" aria-hidden="true">${figureSvg(p.portrait)}</span>`;
}

/* Photographs are squared off and shrunk before they are stored: the
   archive lives in localStorage, and a phone camera file would fill it
   several times over. */
function processPhoto(file, size = 256, ratio = 1) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('not an image'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('unreadable'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('undecodable'));
      img.onload = () => {
        const cw = size;
        const ch = Math.round(size / ratio);   // portraits are square, cars are wide
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#eef0e7';             // paper, for anything the crop leaves bare
        ctx.fillRect(0, 0, cw, ch);
        const scale = Math.max(cw / img.width, ch / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
