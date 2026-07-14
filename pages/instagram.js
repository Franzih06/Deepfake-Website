/**
 * Instagram-Unterseite – Laufzeit-Logik
 * ═══════════════════════════════════════
 * Figma-Canvas: 1440 × 11525 px
 *
 * 1. Responsive Skalierung  – Canvas skaliert proportional zur Viewport-Breite
 * 2. Deepfake-Parallax        – Screenshots hinter Viereck6 bewegen sich beim Scrollen
 */

const CANVAS_W = 1440;
const CANVAS_H_FALLBACK = 9200;
/** Canvas-Pixel unter dem letzten Footer-Button bei Max-Scroll. */
const FOOTER_SCROLL_TAIL = 24;
const FOOTER_SCROLL_VP = 0.96;
const FOOTER_SCROLL_VH_FRAC = 0.04;
const PARALLAX_SECTION_TOP = 5270;
const PARALLAX_VIEWPORT_FACTOR = 0.35;

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ── Sticky Info-Blob (links fix, Posts scrollen rechts) ─────── */

/* Über welche Distanz das Abbremsen am Feed-Ende eingeleitet wird. */
const BLOB_RELEASE_EASE_ZONE = 180;
/* Abstand des letzten Post-Footers zum Viewport-Rand am Endpunkt. */
const BLOB_END_VIEWPORT_MARGIN = 56;
/* Zusätzlicher Scroll über die Zielposition hinaus (Canvas-px). */
const BLOB_POST_OVERSCROLL = 80;

function getFeedScrollEnd(posts, lastPost) {
  if (!lastPost) return posts.offsetHeight;
  const endInParent = lastPost.offsetTop + lastPost.offsetHeight;
  if (endInParent <= posts.offsetHeight + 4) return endInParent;
  return lastPost.offsetTop + lastPost.offsetHeight - posts.offsetTop;
}

/* Pin-Abstand vom Viewport-Rand: bewusst knapp, damit beim Aufklappen der
   langen Antworten (Blob wächst, siehe info-faq.css) maximal Platz nach
   unten bleibt. Der Zurück-Button (schwarzes Quadrat, --z-ui über --z-blob)
   darf dabei ruhig leicht überlappen – beides ist schwarz, kein Bruch. */
const STICKY_PIN_Y = 0;

function getStickyPinY() {
  return STICKY_PIN_Y;
}

const stickyState = {
  blob: null,
  move: null,
  posts: null,
  scale: 1,
  stickyStart: 0,
  stickyEnd: 0,
  maxOffset: 0,
  frozenOffset: 0,
  mode: '',
  transform: '',
};

function setStickyOffset(offsetPx) {
  const { move } = stickyState;
  if (!move) return;

  const y = offsetPx > 0 ? offsetPx : 0;
  const transform = y > 0 ? `translate3d(0,${y.toFixed(2)}px,0)` : '';
  if (stickyState.transform === transform) return;

  stickyState.transform = transform;
  move.style.transform = transform;
}

function applyBlobOffsetCap(rawOffset) {
  const { maxOffset } = stickyState;
  const zoneStart = maxOffset - BLOB_RELEASE_EASE_ZONE;

  if (rawOffset >= zoneStart) {
    const t = Math.min(1, Math.max(0, (rawOffset - zoneStart) / BLOB_RELEASE_EASE_ZONE));
    const eased = t * t * (3 - 2 * t);
    return zoneStart + eased * BLOB_RELEASE_EASE_ZONE;
  }

  return Math.min(rawOffset, maxOffset);
}

function updateStickyBlob() {
  const { blob } = stickyState;
  if (!blob) return;

  const scrollY = window.scrollY;
  const { stickyStart, stickyEnd, maxOffset, scale } = stickyState;

  if (scrollY < stickyStart) {
    if (stickyState.mode !== 'before') {
      setStickyOffset(0);
      blob.classList.remove('is-pinned');
      stickyState.mode = 'before';
      stickyState.frozenOffset = 0;
    }
    return;
  }

  if (scrollY <= stickyEnd) {
    let offset = applyBlobOffsetCap((scrollY - stickyStart) / scale);
    offset = Math.max(0, offset);
    stickyState.frozenOffset = offset;

    setStickyOffset(offset);
    if (stickyState.mode !== 'pinned') {
      blob.classList.add('is-pinned');
      stickyState.mode = 'pinned';
    }
    return;
  }

  setStickyOffset(stickyState.frozenOffset);
  if (stickyState.mode !== 'after') {
    blob.classList.remove('is-pinned');
    stickyState.mode = 'after';
  }
}

function initStickyBlob() {
  stickyState.blob = document.querySelector('.layer--info-blob');
  stickyState.move = document.querySelector('.info-faq__move');
  stickyState.posts = document.querySelector('.layer--posts');
  cacheStickyMetrics();
  updateStickyBlob();
}

function cacheStickyMetrics() {
  const { blob, posts } = stickyState;
  if (!blob || !posts) return;

  const scale = getPageScale();
  const blobTop = blob.offsetTop;
  const stickyStart = blobTop * scale - getStickyPinY();

  const lastPost = posts.querySelector('.post:last-child');
  const postsBottomCanvas = posts.offsetTop + getFeedScrollEnd(posts, lastPost);
  const targetLastPostBottomVp = window.innerHeight - BLOB_END_VIEWPORT_MARGIN;

  let maxOffset = (postsBottomCanvas * scale - stickyStart - targetLastPostBottomVp) / scale;
  maxOffset += BLOB_POST_OVERSCROLL;
  maxOffset = Math.max(0, maxOffset);

  stickyState.scale = scale;
  stickyState.stickyStart = stickyStart;
  stickyState.stickyEnd = stickyStart + maxOffset * scale;
  stickyState.maxOffset = maxOffset;
}

const FAQ_TRIGGER_VP = 0.42;
const FAQ_TRIGGER_HYSTERESIS = 160;

const faqState = {
  root: null,
  items: [],
  posts: [],
  triggers: [],
  activeIndex: null,
  scrollSyncLocked: false,
  clickTargetIndex: null,
  clickUnlockTimer: null,
  scrollIdleTimer: null,
  scrollRaf: 0,
};

function cacheFaqTriggers() {
  const triggerLine = window.innerHeight * FAQ_TRIGGER_VP;

  faqState.triggers = faqState.posts.map(post => {
    const media = post.querySelector('.post__media');
    if (!media) return Infinity;
    const rect = media.getBoundingClientRect();
    return window.scrollY + rect.top - triggerLine;
  });
}

function getScrollActiveIndex(scrollY) {
  let candidate = -1;
  faqState.triggers.forEach((trigger, i) => {
    if (scrollY >= trigger) candidate = i;
  });

  const current = faqState.activeIndex;
  if (current !== null && candidate < current) {
    const holdLine = faqState.triggers[current] - FAQ_TRIGGER_HYSTERESIS;
    if (scrollY >= holdLine) return current;
  }

  return candidate;
}

function setActiveFaqItem(index, { instant = false } = {}) {
  if (faqState.activeIndex === index) return;
  faqState.activeIndex = index;

  const { root } = faqState;
  if (!instant && root) root.classList.add('is-instant');

  faqState.items.forEach((item, i) => {
    item.classList.toggle('is-open', index !== null && i === index);
  });

  if (!instant && root) {
    requestAnimationFrame(() => root.classList.remove('is-instant'));
  }
}

function lockFaqHeight() {
  const move = faqState.root?.querySelector('.info-faq__move');
  const layer = document.querySelector('.layer--info-blob');
  if (!move || !faqState.root) return;

  faqState.root.classList.add('is-instant');

  let maxH = 0;
  let maxAnswerH = 0;
  const measure = () => {
    maxH = Math.max(maxH, move.offsetHeight);
  };
  const measureAnswer = (item) => {
    const inner = item.querySelector('.info-faq__a-inner');
    if (inner) maxAnswerH = Math.max(maxAnswerH, inner.offsetHeight);
  };

  faqState.items.forEach((_, i) => {
    faqState.items.forEach((item, j) => {
      item.classList.toggle('is-open', j === i);
    });
    measure();
    measureAnswer(faqState.items[i]);
  });
  faqState.items.forEach(item => item.classList.remove('is-open'));
  measure();

  faqState.root.classList.remove('is-instant');

  move.style.minHeight = `${maxH}px`;
  if (layer) layer.style.minHeight = `${maxH}px`;
  if (maxAnswerH > 0) {
    move.style.setProperty('--faq-answer-h', `${maxAnswerH}px`);
  }
}

function syncFaqFromScroll() {
  if (faqState.scrollSyncLocked || !faqState.triggers.length) return;
  updateInfoFaqFromScroll();
}

function updateInfoFaqFromScroll() {
  if (faqState.scrollSyncLocked || !faqState.triggers.length) return;

  if (faqState.clickTargetIndex !== null) {
    const idx = faqState.clickTargetIndex;
    setActiveFaqItem(idx, { instant: true });
    const target = faqState.triggers[idx];
    if (target !== undefined && window.scrollY >= target - 12) {
      faqState.clickTargetIndex = null;
    }
    return;
  }

  const scrollY = window.scrollY;
  const { stickyStart, stickyEnd } = stickyState;

  if (scrollY < stickyStart) {
    setActiveFaqItem(null, { instant: true });
    return;
  }

  const activeIndex = getScrollActiveIndex(scrollY);

  if (scrollY > stickyEnd) {
    const lastIndex = faqState.triggers.length - 1;
    if (scrollY >= faqState.triggers[lastIndex]) {
      setActiveFaqItem(lastIndex, { instant: true });
    } else if (activeIndex >= 0) {
      setActiveFaqItem(activeIndex, { instant: true });
    }
    return;
  }

  setActiveFaqItem(activeIndex >= 0 ? activeIndex : null, { instant: true });
}

function markFaqScrolling() {
  const { root } = faqState;
  if (!root) return;

  root.classList.add('is-scrolling');
  clearTimeout(faqState.scrollIdleTimer);
  faqState.scrollIdleTimer = setTimeout(() => {
    root.classList.remove('is-scrolling');
    syncFaqFromScroll();
  }, 120);
}

function scrollToPost(index) {
  const post = faqState.posts[index];
  if (!post) return;

  const media = post.querySelector('.post__media');
  if (!media) return;

  clearTimeout(faqState.clickUnlockTimer);
  faqState.scrollSyncLocked = true;
  faqState.clickTargetIndex = index;
  setActiveFaqItem(index);

  const runScroll = () => {
    cacheFaqTriggers();
    cacheStickyMetrics();
    updateStickyBlob();

    const target = faqState.triggers[index];
    if (target === undefined) return;

    window.scrollTo({
      top: Math.max(0, target),
      behavior: prefersReduced.matches ? 'auto' : 'smooth',
    });
  };

  requestAnimationFrame(() => requestAnimationFrame(runScroll));

  const unlockMs = prefersReduced.matches ? 0 : 900;
  faqState.clickUnlockTimer = window.setTimeout(() => {
    cacheFaqTriggers();
    cacheStickyMetrics();
    faqState.scrollSyncLocked = false;
    setActiveFaqItem(index);
    updateStickyBlob();
  }, unlockMs);
}

function initInfoFaq() {
  faqState.root = document.getElementById('info-faq');
  faqState.items = [...document.querySelectorAll('#info-faq .info-faq__item')];
  faqState.posts = [...document.querySelectorAll('#section-feed .post')];

  lockFaqHeight();
  cacheFaqTriggers();

  faqState.items.forEach((item, i) => {
    item.querySelector('.info-faq__q').addEventListener('click', () => {
      scrollToPost(i);
    });
  });

  syncFaqFromScroll();
}

/* ── Sticky Text-Karten „Vom KI-Influencer / zum Deepfake“ ────────
   Jede Karte (KI Promis / Sexualisierung) bleibt fix stehen, solange
   das zugehörige Deepfake-Bild durch sein Cutout in der dunklen Maske
   scrollt, und löst sich erst am Ende des Cutouts wieder. Gleiches
   Prinzip wie der Info-Blob oben, nur pro Karte an ihr eigenes
   .sec-dark__hole gekoppelt (Reihenfolge = contentHoles-Reihenfolge
   in instagram.html). */

/* Größerer Wert = Karte pinnt früher (schon weiter unten im Viewport),
   statt erst kurz vorm oberen Rand – sonst ist bis zum Einrasten schon fast
   der ganze zugehörige Post/Foto vorbeigescrollt und die Fixed-Phase bleibt
   kaum sichtbar. */
const CARD_STICKY_PIN_Y = 450;
/* Wie viel vom zugehörigen Bild/Cutout die Karte fixiert bleibt, bevor sie
   normal weiterscrollt. War auf 0.5 – wirkte kaum wahrnehmbar fixiert. */
const CARD_STICKY_DURATION_FRACTION = 0.85;

function createCardSticky(card, hole) {
  const state = { scale: 1, stickyStart: 0, stickyEnd: 0, maxOffset: 0, mode: '', transform: '' };

  function setOffset(offsetPx) {
    const y = offsetPx > 0 ? Math.round(offsetPx) : 0;
    const transform = y > 0 ? `translate3d(0,${y}px,0)` : '';
    if (state.transform === transform) return;
    state.transform = transform;
    card.style.transform = transform;
  }

  function cache() {
    const scale = getPageScale();
    const cardTop = card.offsetTop;
    const holeH = hole.getBoundingClientRect().height;

    state.scale = scale;
    state.stickyStart = cardTop * scale - CARD_STICKY_PIN_Y;
    state.stickyEnd = state.stickyStart + holeH * CARD_STICKY_DURATION_FRACTION;
    state.maxOffset = (state.stickyEnd - state.stickyStart) / scale;
  }

  function update() {
    const scrollY = window.scrollY;
    const { stickyStart, stickyEnd, maxOffset, scale } = state;

    if (scrollY < stickyStart) {
      if (state.mode !== 'before') {
        setOffset(0);
        card.classList.remove('is-pinned');
        state.mode = 'before';
      }
      return;
    }

    if (scrollY <= stickyEnd) {
      setOffset((scrollY - stickyStart) / scale);
      if (state.mode !== 'pinned') {
        card.classList.add('is-pinned');
        state.mode = 'pinned';
      }
      return;
    }

    setOffset(maxOffset);
    if (state.mode !== 'after') {
      card.classList.remove('is-pinned');
      state.mode = 'after';
    }
  }

  return { cache, update };
}

const cardStickies = [];

function initCardStickies() {
  // df-post trägt seit dem Maskenumbau kein sec-dark__hole mehr (eigene
  // Pixel-Silhouette statt Loch) – seine eigene Höhe dient als Referenz.
  // Reel-Video ist eigener Layer – dient als Sticky-Referenz für df-card-b.
  const dfPost = document.querySelector('.layer--df-post');
  const dfReel = document.querySelector('.layer--df-reel');
  const cardT = document.querySelector('.layer--df-card-t');
  const cardB = document.querySelector('.layer--df-card-b');

  if (dfPost && cardT) cardStickies.push(createCardSticky(cardT, dfPost));
  if (dfReel && cardB) cardStickies.push(createCardSticky(cardB, dfReel));

  cacheCardStickies();
  updateCardStickies();
}

function cacheCardStickies() {
  cardStickies.forEach(s => s.cache());
}

function updateCardStickies() {
  cardStickies.forEach(s => s.update());
}

/* ── Titel bleibt mittig im Viewport stehen, bis eine Fläche darüber
   schiebt (z.B. „Vom KI-Influencer“ vs. die dunkle Sektion) ─────── */

const TITLE_PIN_VP_FRACTION = 0.45;

function createOverlayPin(el, overlayEl, vpFraction) {
  const state = { scale: 1, stickyStart: 0, stickyEnd: 0, maxOffset: 0, transform: '' };

  function setOffset(offsetPx) {
    const y = offsetPx > 0 ? Math.round(offsetPx) : 0;
    const transform = y > 0 ? `translate3d(0,${y}px,0)` : '';
    if (state.transform === transform) return;
    state.transform = transform;
    el.style.transform = transform;
  }

  function cache() {
    const scale = getPageScale();
    const pinY = window.innerHeight * vpFraction;
    state.scale = scale;
    state.stickyStart = el.offsetTop * scale - pinY;
    state.stickyEnd = overlayEl.offsetTop * scale - pinY;
    state.maxOffset = Math.max(0, (state.stickyEnd - state.stickyStart) / scale);
  }

  function update() {
    const scrollY = window.scrollY;
    const { stickyStart, stickyEnd, maxOffset, scale } = state;

    if (scrollY < stickyStart) {
      setOffset(0);
      return;
    }
    if (scrollY <= stickyEnd) {
      setOffset((scrollY - stickyStart) / scale);
      return;
    }
    setOffset(maxOffset);
  }

  return { cache, update };
}

const overlayPins = [];

function initOverlayPins() {
  const titleVom = document.querySelector('.layer--title-vom');
  const secDark = document.querySelector('.sec-dark');

  if (titleVom && secDark) overlayPins.push(createOverlayPin(titleVom, secDark, TITLE_PIN_VP_FRACTION));

  cacheOverlayPins();
  updateOverlayPins();
}

function cacheOverlayPins() {
  overlayPins.forEach(p => p.cache());
}

function updateOverlayPins() {
  overlayPins.forEach(p => p.update());
}

/* ── Footer scrollt mittig aus sec-dark hervor ──────────────────── */

const footerScrollOut = { cache() {}, update() {} };

const FOOTER_CENTER_X = '-50%';

function footerTransform(y) {
  const py = Math.max(0, Math.round(y));
  return py > 0 ? `translate3d(${FOOTER_CENTER_X}, ${py}px, 0)` : `translate3d(${FOOTER_CENTER_X}, 0, 0)`;
}

function getFooterMetrics(footer) {
  const root = document.documentElement;
  const underlap = parseFloat(getComputedStyle(root).getPropertyValue('--ig-footer-underlap')) || 448;
  const scrollExtra = parseFloat(getComputedStyle(root).getPropertyValue('--ig-footer-scroll-extra')) || 520;
  const footerH = footer.offsetHeight;
  const secDark = document.querySelector('.sec-dark');
  const secBottom = secDark
    ? secDark.offsetTop + secDark.offsetHeight
    : footer.offsetTop + underlap;

  return {
    underlap,
    footerH,
    secBottom,
    naturalTop: secBottom - underlap,
    revealDistance: underlap + footerH + scrollExtra,
  };
}

function createFooterScrollOut(footer) {
  const state = {
    scale: 1,
    stickyStart: 0,
    stickyEnd: 0,
    naturalTop: 0,
    revealDistance: 0,
    released: false,
    transform: '',
  };

  function releaseFooter() {
    if (state.released) return;
    state.released = true;
    state.transform = footerTransform(0);
    footer.style.transform = state.transform;
    footer.style.top = `${state.naturalTop + state.revealDistance}px`;
  }

  function resetFooter() {
    state.released = false;
    footer.style.top = '';
    setOffset(0);
  }

  function setOffset(px) {
    if (state.released) return;
    const transform = footerTransform(px);
    if (state.transform === transform) return;
    state.transform = transform;
    footer.style.transform = transform;
  }

  function cache() {
    const scale = getPageScale();
    const { naturalTop, revealDistance, secBottom } = getFooterMetrics(footer);

    state.scale = scale;
    state.naturalTop = naturalTop;
    state.revealDistance = revealDistance;
    state.stickyStart = secBottom * scale - window.innerHeight * FOOTER_SCROLL_VP;
    state.stickyEnd = state.stickyStart + revealDistance * scale;

    if (state.released) {
      footer.style.transform = footerTransform(0);
      footer.style.top = `${naturalTop + revealDistance}px`;
    }
  }

  function update() {
    if (prefersReduced.matches) {
      releaseFooter();
      return;
    }

    const scrollY = window.scrollY;
    const { stickyStart, stickyEnd, scale } = state;

    if (scrollY < stickyStart) {
      resetFooter();
      setOffset(0);
      return;
    }

    if (scrollY >= stickyEnd) {
      releaseFooter();
      return;
    }

    if (state.released) {
      state.released = false;
      footer.style.top = '';
    }

    setOffset((scrollY - stickyStart) / scale);
  }

  return { cache, update };
}

function initFooterScrollOut() {
  const footer = document.querySelector('.layer--footer');
  if (!footer) return;

  const ctrl = createFooterScrollOut(footer);
  footerScrollOut.cache = ctrl.cache;
  footerScrollOut.update = ctrl.update;

  const sync = () => {
    footerScrollOut.cache();
    footerScrollOut.update();
  };

  sync();
  requestAnimationFrame(() => requestAnimationFrame(sync));
}

function cacheFooterScrollOut() {
  footerScrollOut.cache();
}

function updateFooterScrollOut() {
  footerScrollOut.update();
}

function cacheLayoutMetrics() {
  cacheStickyMetrics();
  cacheFaqTriggers();
  cacheCardStickies();
  cacheOverlayPins();
  cacheFooterScrollOut();
}

function getPageScale() {
  if (window.PageScale) return window.PageScale.getScale();
  const canvasViewH = CANVAS_W * 9 / 16;
  return Math.min(window.innerWidth / CANVAS_W, window.innerHeight / canvasViewH) || 1;
}

function getCanvasH() {
  const scale = getPageScale();
  const footer = document.querySelector('.layer--footer');
  if (!footer) return CANVAS_H_FALLBACK;

  const { naturalTop, revealDistance, footerH } = getFooterMetrics(footer);
  const vhCanvas = window.innerHeight / scale;

  /* Endposition nach Herausscrollen + kurzer Puffer darunter */
  return Math.ceil(
    naturalTop + revealDistance + footerH + vhCanvas * FOOTER_SCROLL_VH_FRAC + FOOTER_SCROLL_TAIL
  );
}

function updateScale() {
  if (window.PageScale) window.PageScale.sync();
  const scale = getPageScale();
  const canvasH = getCanvasH();
  const root = document.documentElement;

  root.style.setProperty('--canvas-h', String(canvasH));
  root.style.setProperty('--page-scale', String(scale));
  root.style.setProperty('--page-height', `${canvasH * scale}px`);
}

function updateParallax() {
  const layers = document.querySelectorAll('.parallax-df');
  if (!layers.length) return;

  if (prefersReduced.matches) {
    layers.forEach(el => { el.style.transform = ''; });
    return;
  }

  const scale = getPageScale();
  const scrollY = window.scrollY;
  const sectionTop = PARALLAX_SECTION_TOP * scale;
  const enterAt = sectionTop - window.innerHeight * PARALLAX_VIEWPORT_FACTOR;

  layers.forEach(el => {
    const speed = parseFloat(el.dataset.parallaxY) || 0.12;
    const sectionScroll = Math.max(0, scrollY - enterAt);
    const drift = -(sectionScroll * speed) / scale;
    el.style.transform = `translate3d(0, ${drift}px, 0)`;
  });
}

function scheduleScrollFrame() {
  if (faqState.scrollRaf) return;
  faqState.scrollRaf = requestAnimationFrame(() => {
    faqState.scrollRaf = 0;
    updateParallax();
    syncFaqFromScroll();
    updateStickyBlob();
    updateCardStickies();
    updateOverlayPins();
    updateFooterScrollOut();
  });
}

function onScroll() {
  markFaqScrolling();
  scheduleScrollFrame();
}

function onResize() {
  updateScale();
  lockFaqHeight();
  cacheLayoutMetrics();
  updateParallax();
  syncFaqFromScroll();
  updateStickyBlob();
  updateCardStickies();
  updateOverlayPins();
  updateFooterScrollOut();
}

/* ── Teaser: Text blendet beim Scrollen ein (ersetzt Pixel-Aufbau) ─ */

function initTeaserReveal() {
  const section = document.querySelector('.layer--teaser');
  if (!section) return;

  const show = () => section.classList.add('is-visible');

  if (prefersReduced.matches || !('IntersectionObserver' in window)) {
    show();
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        show();
        observer.disconnect();
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -10%' });

  observer.observe(section);
}

function initReelVideo() {
  const reel = document.querySelector('.layer--df-reel');
  if (!reel) return;

  const play = () => { reel.play().catch(() => {}); };
  reel.addEventListener('loadeddata', play, { once: true });
  reel.addEventListener('canplay', play, { once: true });
  play();
}

updateScale();
initStickyBlob();
initInfoFaq();
initReelVideo();
cacheStickyMetrics();
initCardStickies();
initOverlayPins();
initFooterScrollOut();
updateScale();
cacheFooterScrollOut();
updateFooterScrollOut();
initTeaserReveal();
updateParallax();
updateStickyBlob();

window.addEventListener('resize', onResize, { passive: true });
window.addEventListener('scroll', onScroll, { passive: true });
prefersReduced.addEventListener('change', updateParallax);
