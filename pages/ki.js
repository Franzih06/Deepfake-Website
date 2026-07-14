/**
 * KI-Unterseite – Foto-Banner, Live-Counter, Grid-Reveal, Sticky-Labels
 */

const CANVAS_W = 1440;
const STICKY_PIN_VIEWPORT_Y = 100;

const typeStickyItems = [];
const STICKY_TYPE_CLASSES = ['ki-type--foto', 'ki-type--video'];
const LABEL_FONT_CANVAS = 128;

function getPageScale() {
  if (window.PageScale) return window.PageScale.getScale();
  const canvasViewH = CANVAS_W * 9 / 16;
  return Math.min(window.innerWidth / CANVAS_W, window.innerHeight / canvasViewH) || 1;
}

function getCanvasEl() {
  return document.querySelector('.canvas');
}

function getOffsetWithinCanvas(el) {
  const canvas = getCanvasEl();
  if (!canvas || !el) return 0;

  let top = 0;
  let node = el;
  while (node && node !== canvas) {
    top += node.offsetTop;
    node = node.offsetParent;
    if (!node || node === document.body) {
      const scale = getPageScale();
      return (el.getBoundingClientRect().top - canvas.getBoundingClientRect().top) / scale;
    }
  }
  return top;
}

function getStickyPortal() {
  let portal = document.getElementById('ki-sticky-portal');
  if (!portal) {
    portal = document.createElement('div');
    portal.id = 'ki-sticky-portal';
    portal.className = 'ki-sticky-portal';
    document.body.appendChild(portal);
  }
  return portal;
}

function applyFixedLabelStyles(label, left, scale) {
  label.classList.add('is-pinned', 'is-pinned-fixed');
  label.classList.remove('is-sticky-after');
  label.style.setProperty('--sticky-y', '0px');
  label.style.left = `${left}px`;
  label.style.top = `${STICKY_PIN_VIEWPORT_Y}px`;
  label.style.fontSize = `${LABEL_FONT_CANVAS * scale}px`;
}

function clearLabelStyles(label) {
  label.classList.remove('is-pinned', 'is-pinned-fixed', 'is-sticky-after');
  label.style.left = '';
  label.style.top = '';
  label.style.fontSize = '';
  label.style.removeProperty('--sticky-y');
}

function pinLabel(item) {
  if (item.mode === 'pinned') return;

  const { label, scale } = item;
  const row = label.parentElement;
  const rect = label.getBoundingClientRect();

  const spacer = document.createElement('span');
  spacer.className = 'ki-type__label-spacer';
  spacer.setAttribute('aria-hidden', 'true');
  spacer.style.width = `${label.offsetWidth}px`;
  spacer.style.height = `${label.offsetHeight}px`;
  row.insertBefore(spacer, label);

  item.spacer = spacer;
  item.row = row;
  item.pinLeft = rect.left;

  getStickyPortal().appendChild(label);
  applyFixedLabelStyles(label, item.pinLeft, scale);
  item.mode = 'pinned';
}

function unpinLabel(item, mode) {
  if (item.mode === mode) return;

  const { label, row, maxOffset } = item;

  if (item.mode === 'pinned' && item.spacer && row) {
    clearLabelStyles(label);
    row.insertBefore(label, item.spacer);
    item.spacer.remove();
    item.spacer = null;
    item.row = null;
  }

  if (mode === 'after') {
    label.classList.add('is-sticky-after');
    label.style.setProperty('--sticky-y', `${maxOffset}px`);
  } else {
    clearLabelStyles(label);
  }

  item.mode = mode;
}

function refreshPinnedLayout() {
  const scale = getPageScale();

  typeStickyItems.forEach(item => {
    item.scale = scale;
    if (item.mode !== 'pinned' || !item.spacer) return;

    const rect = item.spacer.getBoundingClientRect();
    item.pinLeft = rect.left;
    applyFixedLabelStyles(item.label, item.pinLeft, scale);
  });
}

function resetAudioStickyLabel(existing) {
  const audioLabel = document.querySelector('.ki-type--audio .ki-type__label');
  if (!audioLabel) return;

  const prev = existing.get(audioLabel);
  if (prev) unpinLabel(prev, 'before');
  clearLabelStyles(audioLabel);
}

function cacheTypeStickyMetrics() {
  const scale = getPageScale();
  const existing = new Map(typeStickyItems.map(item => [item.label, item]));

  resetAudioStickyLabel(existing);

  typeStickyItems.length = 0;

  document.querySelectorAll('.ki-type').forEach(section => {
    if (!STICKY_TYPE_CLASSES.some(cls => section.classList.contains(cls))) return;

    const label = section.querySelector('.ki-type__label');
    const inner = section.querySelector('.ki-type__inner');
    if (!label || !inner) return;

    const prev = existing.get(label);
    const marker = prev?.spacer || label;
    const labelTop = getOffsetWithinCanvas(marker);
    const innerBottom = getOffsetWithinCanvas(inner) + inner.offsetHeight;
    const labelHeight = marker.offsetHeight || label.offsetHeight;
    const stickyStart = labelTop * scale - STICKY_PIN_VIEWPORT_Y;
    const stickyEnd = innerBottom * scale - STICKY_PIN_VIEWPORT_Y - labelHeight * scale;

    if (stickyEnd <= stickyStart) return;

    typeStickyItems.push({
      label,
      scale,
      stickyStart,
      stickyEnd,
      maxOffset: (stickyEnd - stickyStart) / scale,
      mode: prev?.mode || 'before',
      spacer: prev?.spacer || null,
      row: prev?.row || null,
      pinLeft: prev?.pinLeft || 0,
    });
  });
}

function updateTypeStickyLabels() {
  const scrollY = window.scrollY;

  typeStickyItems.forEach(item => {
    const { stickyStart, stickyEnd } = item;

    if (scrollY < stickyStart) {
      unpinLabel(item, 'before');
      return;
    }

    if (scrollY <= stickyEnd) {
      if (item.mode === 'after') {
        clearLabelStyles(item.label);
        item.mode = 'before';
      }
      pinLabel(item);
      return;
    }

    unpinLabel(item, 'after');
  });
}

function onTypeStickyScroll() {
  updateTypeStickyLabels();
}

function initTypeStickyLabels() {
  if (!document.querySelector('.ki-type')) return;

  cacheTypeStickyMetrics();
  updateTypeStickyLabels();

  window.addEventListener('scroll', onTypeStickyScroll, { passive: true });
  window.addEventListener('resize', () => {
    cacheTypeStickyMetrics();
    refreshPinnedLayout();
    updateTypeStickyLabels();
  }, { passive: true });
}

const KI_PHOTOS = [
  { src: '../assets/marquee/p1.jpg', alt: 'KI-generiertes Portrait 1' },
  { src: '../assets/marquee/p2.jpg', alt: 'KI-generiertes Portrait 2' },
  { src: '../assets/marquee/p3.jpg', alt: 'KI-generiertes Portrait 3' },
  { src: '../assets/marquee/p4.jpg', alt: 'KI-generiertes Portrait 4' },
  { src: '../assets/marquee/p5.jpg', alt: 'KI-generiertes Portrait 5' },
  { src: '../assets/marquee/p6.jpg', alt: 'KI-generiertes Portrait 6' },
  { src: '../assets/marquee/p7.jpg', alt: 'KI-generiertes Portrait 7' },
];

const INSTAGRAM_MEDIA = [
  { src: '../assets/marquee/01.jpg', alt: 'KI-generiertes iPhone-Foto' },
  { src: '../assets/marquee/02.jpg', alt: 'KI-generiertes Foto' },
  { src: '../assets/marquee/03.jpg', alt: 'KI-generiertes Handy-Foto' },
  { src: '../assets/marquee/04.jpg', alt: 'KI-generiertes Foto' },
  { src: '../assets/marquee/05.jpg', alt: 'KI-generiertes Urlaubsfoto' },
  { src: '../assets/marquee/06.jpg', alt: 'KI-generiertes Café-Foto' },
  { src: '../assets/marquee/07.jpg', alt: 'KI-generiertes Foto' },
  // 08.jpg (= 05) und 10.jpg (= 09) waren interne Duplikate – entfernt
  { src: '../assets/marquee/09.jpg', alt: 'KI-generiertes Glamour-Foto' },
  { src: '../assets/marquee/11.jpg', alt: 'KI-generiertes Selfie' },
  // Neue KI-Bilder
  { src: '../assets/marquee/ki-cafe-latte.jpg', alt: 'KI-generiertes Café-Foto' },
  { src: '../assets/marquee/ki-kueste.jpg',     alt: 'KI-generiertes Urlaubsfoto an der Küste' },
  { src: '../assets/marquee/ki-cafe-denim.jpg', alt: 'KI-generiertes Café-Foto' },
  { src: '../assets/marquee/ki-wandern.jpg',    alt: 'KI-generiertes Wander-Foto' },
  { src: '../assets/marquee/ki-glamour.jpg',    alt: 'KI-generiertes Glamour-Foto' },
  { src: '../assets/marquee/ki-selfie.jpg',     alt: 'KI-generiertes Selfie' },
  { src: '../assets/marquee/ki-pool.jpg',       alt: 'KI-generiertes Pool-Foto' },
];

const MARQUEE_ITEMS = [...KI_PHOTOS, ...INSTAGRAM_MEDIA];

const GRID_COLS = 20;
const GRID_ROWS = 5;
const GRID_TOTAL = GRID_COLS * GRID_ROWS;
const GRID_DIM_COUNT = 2;
const GRID_CELL_DELAY_MS = 45;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const MARQUEE_ASSET_V = '20260701q';
const MARQUEE_COPIES = 2;

function createMarqueeFigure(item) {
  const fig = document.createElement('figure');
  fig.className = 'photo-marquee__item';

  const img = document.createElement('img');
  img.src = `${item.src}?v=${MARQUEE_ASSET_V}`;
  img.alt = item.alt;
  img.width = 181;
  img.height = 211;
  img.decoding = 'async';
  img.addEventListener('error', () => fig.classList.add('is-error'), { once: true });

  fig.appendChild(img);
  return fig;
}

function buildMarqueeTrack(track) {
  if (track.dataset.built) return;
  track.dataset.built = '1';

  const fragment = document.createDocumentFragment();
  for (let copy = 0; copy < MARQUEE_COPIES; copy += 1) {
    MARQUEE_ITEMS.forEach(item => {
      fragment.appendChild(createMarqueeFigure(item));
    });
  }
  track.replaceChildren(fragment);
  track.classList.add('is-ready');

  [...track.querySelectorAll('img')].forEach(img => {
    if (img.decode) img.decode().catch(() => {});
  });
}

function initMarquees() {
  const tracks = document.querySelectorAll('.photo-marquee__track');
  if (!tracks.length) return;

  document.documentElement.style.setProperty('--marquee-count', String(MARQUEE_ITEMS.length));

  tracks.forEach(track => buildMarqueeTrack(track));
}

function buildStatGrid(container) {
  let cellIndex = 0;

  for (let r = 0; r < GRID_ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'ki-grid__row';

    for (let c = 0; c < GRID_COLS; c++) {
      const idx = r * GRID_COLS + c;
      const cell = document.createElement('div');
      cell.className = 'ki-grid__cell';
      cell.style.setProperty('--cell-delay', `${cellIndex * GRID_CELL_DELAY_MS}ms`);
      cellIndex += 1;

      if (idx >= GRID_TOTAL - GRID_DIM_COUNT) {
        cell.classList.add('ki-grid__cell--dim');
      }
      row.appendChild(cell);
    }

    container.appendChild(row);
  }
}

function initGridReveal(container) {
  if (!container) return;

  if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
    container.classList.add('is-visible');
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.add('is-visible');
      observer.unobserve(target);
    });
  }, { root: null, rootMargin: '0px 0px -5%', threshold: 0.1 });

  observer.observe(container);
}

function initCounter(el) {
  const BASE = 34_000_000;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const msSinceMidnight = Date.now() - startOfDay.getTime();
  let current = Math.floor(BASE * (msSinceMidnight / 86400000));

  function format(n) {
    return n.toLocaleString('de-DE');
  }

  el.textContent = format(current);

  setInterval(() => {
    current += Math.floor(Math.random() * 80) + 40;
    el.textContent = format(current);
  }, 140);
}

/* ── Quiz „Traust du deinen Augen?" ──────────────────────────── */
const QUIZ_IMAGES = [
  { src: '../assets/photos/p1.jpg', kind: 'ai' },
  { src: '../assets/photos/p2.jpg', kind: 'ai' },
  { src: '../assets/photos/p4.jpg', kind: 'ai' },
  { src: '../assets/photos/p5.jpg', kind: 'ai' },
  { src: '../assets/photos/p6.jpg', kind: 'ai' },
  { src: '../assets/photos/real-5931.png', kind: 'real' },
];
const QUIZ_ASSET_V = '20260710bp';
const QUIZ_ADVANCE_MS = 1400;

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function initQuiz(root) {
  const img       = root.querySelector('#ki-quiz-img');
  const card      = root.querySelector('#ki-quiz-card');
  const verdict   = root.querySelector('#ki-quiz-verdict');
  const progress  = root.querySelector('#ki-quiz-progress');
  const buttonBox = root.querySelector('#ki-quiz-buttons');
  const result    = root.querySelector('#ki-quiz-result');
  const resultHead = root.querySelector('#ki-quiz-result-head');
  const resultSub  = root.querySelector('#ki-quiz-result-sub');
  const retry     = root.querySelector('#ki-quiz-retry');
  const buttons   = [...buttonBox.querySelectorAll('.ki-quiz__btn')];
  if (!img || !buttons.length) return;

  let order = shuffle(QUIZ_IMAGES);
  let index = 0;
  let score = 0;
  let advanceTimer = null;

  const dots = order.map(() => {
    const dot = document.createElement('span');
    dot.className = 'ki-quiz__dot';
    progress.appendChild(dot);
    return dot;
  });
  progress.setAttribute('aria-valuemax', String(order.length));

  function updateDots() {
    dots.forEach((dot, i) => {
      dot.classList.toggle('ki-quiz__dot--done', i < index);
      dot.classList.toggle('ki-quiz__dot--current', i === index);
    });
    progress.setAttribute('aria-valuenow', String(index + 1));
  }

  function showImage() {
    const item = order[index];
    img.src = `${item.src}?v=${QUIZ_ASSET_V}`;
    updateDots();
    card.classList.remove('is-revealed');
    verdict.textContent = '';
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.classList.remove('ki-quiz__btn--truth', 'ki-quiz__btn--miss');
    });
  }

  function reveal(answer) {
    const item = order[index];
    const truth = item.kind;
    const correct = answer === truth;
    if (correct) score += 1;

    buttons.forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.answer === truth) btn.classList.add('ki-quiz__btn--truth');
      else if (btn.dataset.answer === answer) btn.classList.add('ki-quiz__btn--miss');
    });

    verdict.textContent = correct
      ? (truth === 'ai'
        ? 'Richtig – dieses Bild ist KI-generiert.'
        : 'Richtig – dieses Bild ist echt.')
      : (truth === 'ai'
        ? 'Falsch – dieses Bild ist KI-generiert.'
        : 'Falsch – dieses Bild ist echt.');
    card.classList.add('is-revealed');

    advanceTimer = window.setTimeout(() => {
      index += 1;
      if (index >= order.length) finish();
      else showImage();
    }, QUIZ_ADVANCE_MS);
  }

  function finish() {
    const aiCount = order.filter(item => item.kind === 'ai').length;
    const realCount = order.filter(item => item.kind === 'real').length;

    root.classList.add('is-finished');
    result.hidden = false;
    resultHead.innerHTML = `${score} von ${order.length} richtig.`;
    resultSub.textContent = score === order.length
      ? `Alle Bilder erkannt – darunter ${realCount} echtes Foto und ${aiCount} KI-generierte.`
      : `Darunter ${realCount} echtes Foto und ${aiCount} KI-generierte Bilder – manche Deepfakes sind kaum vom Original zu unterscheiden.`;
  }

  function restart() {
    window.clearTimeout(advanceTimer);
    order = shuffle(QUIZ_IMAGES);
    index = 0;
    score = 0;
    root.classList.remove('is-finished');
    result.hidden = true;
    showImage();
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      reveal(btn.dataset.answer);
    });
  });
  retry.addEventListener('click', restart);

  showImage();
}

/* ── „Was kann ich tun?" – Unterüberschrift pinnt beim Scrollen (fixed),
   das Textfeld scrollt zu ihr hoch, dockt an und bleibt stehen – erst dort
   schaltet der Goo-Verbindungseffekt ein (während der Bewegung aus → keine
   Schlieren). ──────────────────────────────────────────────────────────── */
const HELP_PIN_VIEWPORT = 0.30;   // Ziel: Pill-Oberkante bei 30 % der Fensterhöhe
const HELP_DOCK_OVERLAP = 26;     // Canvas-px Überlappung Pill↔Box für den Goo-Neck

function initHelpDock(section) {
  const items = [...section.querySelectorAll('.ki-help__qa')]
    .map(block => ({
      block,
      pill: block.querySelector('.ki-help__pill'),
      box: block.querySelector('.ki-help__box'),
      pinStart: 0,
      travel: 0,
    }))
    .filter(it => it.pill && it.box);
  if (!items.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function measure() {
    const scale = getPageScale();
    const y = window.scrollY;
    // erst alle Pins zurücksetzen, dann die natürlichen Positionen lesen
    items.forEach(it => it.block.style.setProperty('--pill-y', '0px'));
    items.forEach(it => {
      const pillRect = it.pill.getBoundingClientRect();
      const boxRect = it.box.getBoundingClientRect();
      const pillDocTop = pillRect.top + y;
      const pillH = pillRect.height;
      const boxDocTop = boxRect.top + y;
      const targetTop = window.innerHeight * HELP_PIN_VIEWPORT;
      it.pinStart = pillDocTop - targetTop;
      // angedockt, sobald Box-Oberkante die Pill-Unterkante (minus Überlappung) erreicht
      const dockScroll = boxDocTop - (targetTop + pillH) + HELP_DOCK_OVERLAP * scale;
      it.travel = Math.max(0, (dockScroll - it.pinStart) / scale);
    });
  }

  function update() {
    const scale = getPageScale();
    const y = window.scrollY;
    items.forEach(it => {
      const raw = (y - it.pinStart) / scale;
      const pillY = Math.max(0, Math.min(raw, it.travel));
      it.block.style.setProperty('--pill-y', `${pillY.toFixed(1)}px`);
      it.block.classList.toggle('is-connected', raw >= it.travel - 0.5);
    });
  }

  if (reduce) {
    measure();
    items.forEach(it => {
      it.block.style.setProperty('--pill-y', `${it.travel.toFixed(1)}px`);
      it.block.classList.add('is-connected');
    });
    return;
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    }
  }

  measure();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { measure(); update(); }, { passive: true });
}

/* Pill-Breite an den Text anpassen: misst den natürlichen Textumfang und
   setzt --pill-w = Text + symmetrisches Padding (mind. 700, damit die Pill
   die Box für den Goo-Effekt noch überlappt). */
const HELP_PILL_MIN_W = 700;

function sizeHelpPills(section) {
  section.querySelectorAll('.ki-help__qa').forEach(block => {
    const sub = block.querySelector('.ki-help__sub');
    if (!sub) return;
    sub.style.width = 'max-content';
    const w = Math.max(Math.ceil(sub.offsetWidth), HELP_PILL_MIN_W);
    sub.style.width = '';
    block.style.setProperty('--pill-w', `${w}px`);
  });
}

function initPage() {
  initMarquees();
  initTypeStickyLabels();

  const gridEl = document.getElementById('ki-grid');
  if (gridEl) {
    buildStatGrid(gridEl);
    initGridReveal(gridEl);
  }

  const counterEl = document.getElementById('ki-counter');
  if (counterEl) initCounter(counterEl);

  const quizEl = document.getElementById('ki-quiz');
  if (quizEl) initQuiz(quizEl);

  const helpEl = document.querySelector('.ki-help');
  if (helpEl) {
    const sizePills = () => sizeHelpPills(helpEl);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(sizePills);
    } else {
      sizePills();
    }
    initHelpDock(helpEl);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
