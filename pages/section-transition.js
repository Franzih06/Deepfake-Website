/**
 * Pixel-Skyline Section-Übergang
 * Port von Section-Uebergang.html – feste HEIGHTS / FLOATS / HOLES
 */

const SEC_TRANS_DEFAULTS = {
  cols: 16,
  rows: 6,
  overlap: 2,
  topColor: '#f9f9f9',
  darkColor: '#0E0E0E',
  heights: [3, 3, 3, 4, 4, 3, 5, 6, 6, 4, 3, 3, 4, 3, 3, 3],
  floats: [[1, 4], [11, 4], [14, 5]],
  holes: [[2, 1], [4, 0], [6, 2], [9, 1], [12, 0]],
  holeOffset: 0,   // Löcher in Zellen von der dunklen Kante wegschieben
  contentHoles: [],
};

function parseSecConfig(el) {
  try {
    return { ...SEC_TRANS_DEFAULTS, ...JSON.parse(el.dataset.config || '{}') };
  } catch {
    return { ...SEC_TRANS_DEFAULTS };
  }
}

function buildTransitionBand(band, cfg) {
  const sky = band.querySelector('.sec-trans__sky');
  const holesEl = band.querySelector('.sec-trans__holes');
  if (!sky || !holesEl) return;

  const reverse = Boolean(cfg.reverse);

  /* Oben + unten: immer heller Band-Hintergrund, schwarze Pixel – unten nur gespiegelt */
  band.style.setProperty('--sec-top', cfg.topColor);
  band.style.setProperty('--sec-dark', cfg.darkColor);

  const W = band.clientWidth || 1440;
  const CELL = W / cfg.cols;
  const H = Math.round(cfg.rows * CELL);
  band.style.height = `${H}px`;

  sky.innerHTML = '';
  holesEl.innerHTML = '';

  cfg.heights.forEach((rows, c) => {
    const bar = document.createElement('div');
    bar.className = 'sec-trans__bar';
    let x = c * CELL - cfg.overlap / 2;
    let w = CELL + cfg.overlap;
    if (c === 0) { x = -cfg.overlap; w = CELL + 1.5 * cfg.overlap; }
    if (c === cfg.cols - 1) w = W - c * CELL + cfg.overlap;

    bar.style.left = `${x}px`;
    bar.style.width = `${w}px`;
    bar.style.height = `${rows * CELL + cfg.overlap}px`;

    if (reverse) {
      bar.style.top = `${-cfg.overlap}px`;
    } else {
      bar.style.bottom = `${-cfg.overlap}px`;
    }

    sky.appendChild(bar);
  });

  cfg.floats.forEach(([c, r]) => {
    const f = document.createElement('div');
    f.className = 'sec-trans__float';
    f.style.left = `${c * CELL}px`;
    f.style.width = `${CELL}px`;
    f.style.height = `${CELL}px`;
    f.style.top = reverse
      ? `${r * CELL}px`
      : `${H - (r + 1) * CELL}px`;
    sky.appendChild(f);
  });

  const hs = CELL * 0.78;
  const pad = (CELL - hs) / 2;
  cfg.holes.forEach(([c, r]) => {
    const hole = document.createElement('div');
    hole.className = 'sec-trans__hole';
    hole.style.left = `${c * CELL + pad}px`;
    hole.style.width = `${hs}px`;
    hole.style.height = `${hs}px`;
    hole.style.top = reverse
      ? `${r * CELL + pad + cfg.holeOffset * CELL}px`
      : `${H - (r + 1) * CELL + pad - cfg.holeOffset * CELL}px`;
    holesEl.appendChild(hole);
  });
}

function buildDarkMask(mask, cfg) {
  const holesWrap = mask.querySelector('.sec-dark__holes');
  if (!holesWrap) return;

  mask.style.setProperty('--sec-dark', cfg.darkColor);
  holesWrap.innerHTML = '';

  cfg.contentHoles.forEach(({ x, y, w, h, rx = 8 }) => {
    const hole = document.createElement('div');
    hole.className = 'sec-dark__hole';
    hole.style.left = `${x}px`;
    hole.style.top = `${y}px`;
    hole.style.width = `${w}px`;
    hole.style.height = `${h}px`;
    hole.style.borderRadius = `${rx}px`;
    holesWrap.appendChild(hole);
  });
}

function initSectionTransition(el) {
  const cfg = parseSecConfig(el);
  if (el.classList.contains('sec-trans')) buildTransitionBand(el, cfg);
  if (el.classList.contains('sec-dark')) buildDarkMask(el, cfg);
}

function initSectionTransitions() {
  document.querySelectorAll('[data-sec-transition]').forEach(initSectionTransition);
}

let secTransResizeTimer;
function onSectionTransitionResize() {
  clearTimeout(secTransResizeTimer);
  secTransResizeTimer = setTimeout(initSectionTransitions, 150);
}

initSectionTransitions();
window.addEventListener('resize', onSectionTransitionResize, { passive: true });
