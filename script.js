/**
 * Hauptseite – Traue deinen Augen nicht
 * Figma: node 616:1067 (7140 × 1440 px)
 * Parallax reference: chromia.com horizontal scroll depth
 */

const CANVAS_WIDTH  = 7140;
const CANVAS_HEIGHT = 1440;

const MEDIA = [
  { type: 'image', src: 'assets/media/01.png' },
  { type: 'video', src: 'assets/media/02.mp4' },
  { type: 'image', src: 'assets/media/03.png' },
  { type: 'video', src: 'assets/media/04.mp4' },
  { type: 'image', src: 'assets/media/05.png' },
  { type: 'video', src: 'assets/media/06.mp4' },
  { type: 'image', src: 'assets/media/07.png' },
  { type: 'video', src: 'assets/media/08.mp4' },
  { type: 'image', src: 'assets/media/09.png' },
  { type: 'video', src: 'assets/media/10.mp4' },
  { type: 'image', src: 'assets/media/11.png' },
];

/** 10 tiles – positions from Figma Hauptseite (616:1067) */
const PHOTOS = [
  /* above headline – fastest layer, each unique speed */
  { left: 724.05,  top: 66.37,  width: 492.905, height: 537.309, rotate:  5.97,  zone: 'above', media: 0, parallax: 0.34 },
  { left: 1721.58, top: 102.55, width: 374.923, height: 456.746, rotate: -5.78,  zone: 'above', media: 2, parallax: 0.46 },
  { left: 3006.45, top: 102.81, width: 433.31,  height: 508.874, rotate:  4.56,  zone: 'above', media: 4, parallax: 0.38 },
  { left: 4591.69, top: 64.38,  width: 485.254, height: 651.923, rotate: -4.96,  zone: 'above', media: 6, parallax: 0.26 },
  { left: 6589.74, top: 51.67,  width: 480.997, height: 606.208, rotate: -4.79,  zone: 'above', media: 8, parallax: 0.42 },

  /* below headline – slower, each unique speed */
  { left: 224.37,  top: 771.4,  width: 491.757, height: 577.035, rotate: -7.11,  zone: 'below', media: 1, parallax: 0.11 },
  { left: 2048.17, top: 807.82, width: 393.803, height: 478.133, rotate:  2.89,  zone: 'below', media: 3, parallax: 0.17 },
  { left: 3626.79, top: 741.21, width: 496.903, height: 606.76,  rotate: -5.68,  zone: 'below', media: 5, parallax: 0.13 },
  { left: 5280,   top: 732.74, width: 473.364, height: 579.657, rotate:  4.71,  zone: 'below', media: 7, parallax: 0.20 },
  { left: 6680,   top: 793.96, width: 429.127, height: 516.718, rotate: -7.25,  zone: 'below', media: 9, parallax: 0.15 },
];

/** Per-element parallax speeds (fraction of scrollLeft) */
const PARALLAX = {
  title: 0.008,
  nav: {
    ki:         0.22,
    instagram:  0.32,
    tiktok:     0.18,
    tinder:     0.26,
  },
};

function getPhotoScale() {
  const val = getComputedStyle(document.documentElement).getPropertyValue('--photo-scale');
  return parseFloat(val) || 1;
}

const viewport   = document.getElementById('scroll-viewport');
const canvas     = document.getElementById('hero-canvas');
const photoLayer = document.getElementById('photo-layer');
const titleEl    = document.querySelector('.hero-title');
const navBtns    = document.querySelectorAll('.nav-btn');
const kiWrap       = document.querySelector('.nav-btn-wrap--ki');
const igWrap       = document.querySelector('.nav-btn-wrap--instagram');
const KI_BTN_WIDTH = 1040;


function createMediaElement(media, index) {
  if (media.type === 'video') {
    const video = document.createElement('video');
    video.src = media.src;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = index < 3 ? 'auto' : 'metadata';
    video.setAttribute('aria-hidden', 'true');
    return video;
  }

  const img = document.createElement('img');
  img.src = media.src;
  img.alt = '';
  img.loading = index < 4 ? 'eager' : 'lazy';
  img.onerror = () => img.remove();
  return img;
}

function scaledDimensions(photo) {
  const s = getPhotoScale();
  const width  = photo.width  * s;
  const height = photo.height * s;
  const left   = photo.left   - (width  - photo.width)  / 2;
  const top    = photo.top    - (height - photo.height) / 2;
  return { width, height, left, top };
}

function buildPhotoTiles() {
  PHOTOS.forEach((photo, index) => {
    const size = scaledDimensions(photo);

    const tile = document.createElement('div');
    tile.className = 'photo-tile';
    tile.dataset.index = index;
    tile.dataset.parallax = photo.parallax;
    tile.style.cssText = [
      `left:${size.left}px`,
      `top:${size.top}px`,
      `width:${size.width}px`,
      `height:${size.height}px`,
      `transform:rotate(${photo.rotate}deg)`,
    ].join(';');

    const media = MEDIA[photo.media ?? index];
    if (media) tile.appendChild(createMediaElement(media, index));

    photoLayer.appendChild(tile);
  });
}


let scale = 1;

/** Center KI button wrapper in the initial viewport (scrollLeft = 0) */
function centerKiButtonInFirstFrame() {
  if (!kiWrap || scale <= 0) return;
  const visibleCanvasWidth = viewport.clientWidth / scale;
  const left = (visibleCanvasWidth - KI_BTN_WIDTH) / 2;
  kiWrap.style.left = `${Math.max(0, left)}px`;
}

function updateScale() {
  scale = window.innerHeight / CANVAS_HEIGHT;
  canvas.style.transform = `scale(${scale})`;

  let inner = viewport.querySelector('.scroll-inner');
  if (!inner) {
    inner = document.createElement('div');
    inner.className = 'scroll-inner';
    viewport.insertBefore(inner, canvas);
    inner.appendChild(canvas);
  }
  inner.style.width = `${CANVAS_WIDTH * scale}px`;

  centerKiButtonInFirstFrame();
}


function updateParallax() {
  const scrollX = viewport.scrollLeft;

  photoLayer.querySelectorAll('.photo-tile').forEach(tile => {
    const index = Number(tile.dataset.index);
    const photo = PHOTOS[index];
    const factor = Number(tile.dataset.parallax);
    const offsetX = scrollX * factor;

    tile.style.transform =
      `rotate(${photo.rotate}deg) translateX(${-offsetX}px)`;
  });

  const titleOffset = scrollX * PARALLAX.title;
  titleEl.style.transform =
    `translateX(calc(-50% - 0.24px)) translate(${-titleOffset}px, 0)`;

  if (kiWrap) {
    const offsetX = scrollX * PARALLAX.nav.ki;
    kiWrap.style.transform = `translateX(${-offsetX}px)`;
  }

  if (igWrap) {
    const offsetX = scrollX * PARALLAX.nav.instagram;
    igWrap.style.transform = `translateX(${-offsetX}px)`;
  }

  navBtns.forEach(btn => {
    if (btn.classList.contains('nav-btn--ki')) return;
    if (btn.classList.contains('nav-btn--instagram')) return;

    const key = btn.classList.contains('nav-btn--tiktok')     ? 'tiktok'
              : 'tinder';
    const factor = PARALLAX.nav[key];
    const offsetX = scrollX * factor;
    btn.style.transform = `translateX(${-offsetX}px)`;
  });
}


/* ── Smooth horizontal scroll ───────────────────────────────── */

const SCROLL_EASE    = 0.085;
const WHEEL_FACTOR   = 0.82;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

let targetScroll   = 0;
let scrollAnimating = false;

function getMaxScroll() {
  return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
}

function clampScroll(value) {
  return Math.max(0, Math.min(value, getMaxScroll()));
}

function wheelDelta(event) {
  let dx = event.deltaX;
  let dy = event.deltaY;
  if (event.deltaMode === 1) { dx *= 18; dy *= 18; }
  else if (event.deltaMode === 2) {
    dx *= viewport.clientWidth;
    dy *= viewport.clientHeight;
  }
  return Math.abs(dy) >= Math.abs(dx) ? dy : dx;
}

function tickSmoothScroll() {
  const current = viewport.scrollLeft;
  const diff = targetScroll - current;

  if (Math.abs(diff) < 0.4) {
    viewport.scrollLeft = targetScroll;
    updateParallax();
    scrollAnimating = false;
    return;
  }

  viewport.scrollLeft = current + diff * SCROLL_EASE;
  updateParallax();
  requestAnimationFrame(tickSmoothScroll);
}

function startSmoothScroll() {
  if (scrollAnimating) return;
  scrollAnimating = true;
  requestAnimationFrame(tickSmoothScroll);
}

function onWheel(event) {
  const delta = wheelDelta(event);
  if (delta === 0) return;
  event.preventDefault();

  if (prefersReduced.matches) {
    viewport.scrollLeft = clampScroll(viewport.scrollLeft + delta * WHEEL_FACTOR);
    targetScroll = viewport.scrollLeft;
    updateParallax();
    return;
  }

  if (!scrollAnimating) targetScroll = viewport.scrollLeft;
  targetScroll = clampScroll(targetScroll + delta * WHEEL_FACTOR);
  startSmoothScroll();
}


function observePhotos() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const video = entry.target.querySelector('video');
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          video?.play().catch(() => {});
        } else {
          video?.pause();
        }
      });
    },
    { root: viewport, threshold: 0.05 }
  );

  photoLayer.querySelectorAll('.photo-tile').forEach(tile => {
    tile.style.opacity = '0';
    tile.style.transition = 'opacity 0.5s ease';
    observer.observe(tile);
  });
}


buildPhotoTiles();
updateScale();
targetScroll = viewport.scrollLeft;
updateParallax();
observePhotos();

window.addEventListener('resize', () => {
  updateScale();
  targetScroll = clampScroll(targetScroll);
  viewport.scrollLeft = targetScroll;
  updateParallax();
}, { passive: true });

viewport.addEventListener('scroll', () => {
  if (!scrollAnimating) {
    targetScroll = viewport.scrollLeft;
    updateParallax();
  }
}, { passive: true });
viewport.addEventListener('wheel', onWheel, { passive: false });
