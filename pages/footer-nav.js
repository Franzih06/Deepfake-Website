/**
 * Footer-Navigation – mittig, scrollt aus Anker-Section hervor
 */
(function () {
  const FOOTER_SCROLL_TAIL = 40;
  const FOOTER_SCROLL_VP = 0.96;
  const FOOTER_SCROLL_VH_FRAC = 0.04;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const footerScrollOut = { cache() {}, update() {} };

  const FOOTER_CENTER_X = '-50%';

  function footerTransform(y) {
    const py = Math.max(0, Math.round(y));
    return py > 0 ? `translate3d(${FOOTER_CENTER_X}, ${py}px, 0)` : `translate3d(${FOOTER_CENTER_X}, 0, 0)`;
  }

  function readCssVar(name, fallback) {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  }

  function getFooterAnchorBottom() {
    const footer = document.querySelector('.layer--footer');
    const anchorSel = footer && footer.dataset.footerAnchor;
    if (anchorSel) {
      const anchor = document.querySelector(anchorSel);
      if (anchor) return anchor.offsetTop + anchor.offsetHeight;
    }
    const secDark = document.querySelector('.sec-dark');
    if (secDark) return secDark.offsetTop + secDark.offsetHeight;
    return 0;
  }

  function getFooterMetrics(footer) {
    const underlap = readCssVar('--footer-underlap', 448);
    const scrollExtra = readCssVar('--footer-scroll-extra', 240);
    const gap = readCssVar('--footer-gap', 0);
    const footerH = footer.offsetHeight;
    const anchorBottom = getFooterAnchorBottom();

    return {
      underlap,
      footerH,
      anchorBottom,
      naturalTop: anchorBottom + gap - underlap,
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
      const { naturalTop, revealDistance, anchorBottom } = getFooterMetrics(footer);

      state.scale = scale;
      state.naturalTop = naturalTop;
      state.revealDistance = revealDistance;
      state.stickyStart = anchorBottom * scale - window.innerHeight * FOOTER_SCROLL_VP;
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

function getPageScale() {
  if (window.PageScale) return window.PageScale.getScale();
  const canvasW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--canvas-w')) || 1440;
  const canvasViewH = canvasW * 9 / 16;
  return Math.min(window.innerWidth / canvasW, window.innerHeight / canvasViewH) || 1;
}

  function getCanvasH() {
    const footer = document.querySelector('.layer--footer');
    const fallback = readCssVar('--canvas-h', 9200);
    if (!footer) return fallback;

    const { naturalTop, revealDistance, footerH } = getFooterMetrics(footer);
    const vhCanvas = window.innerHeight / getPageScale();

    return Math.ceil(
      naturalTop + revealDistance + footerH + vhCanvas * FOOTER_SCROLL_VH_FRAC + FOOTER_SCROLL_TAIL
    );
  }

  function updatePageHeight() {
    if (window.PageScale) window.PageScale.sync();
    const scale = getPageScale();
    const canvasH = getCanvasH();
    const root = document.documentElement;

    root.style.setProperty('--canvas-h', String(canvasH));
    root.style.setProperty('--page-scale', String(scale));
    root.style.setProperty('--page-height', `${canvasH * scale}px`);
  }

  function initStaticFooter() {
    function syncPageScale() {
      if (window.PageScale) window.PageScale.sync();
      const scale = getPageScale();
      const canvasH = readCssVar('--canvas-h', 9200);
      const root = document.documentElement;

      root.style.setProperty('--page-scale', String(scale));
      root.style.setProperty('--page-height', `${canvasH * scale}px`);
    }

    syncPageScale();
    window.addEventListener('resize', syncPageScale, { passive: true });
  }

  function initFooterNav() {
    const footer = document.querySelector('.layer--footer');
    if (!footer) return;

    if (footer.hasAttribute('data-footer-static')) {
      initStaticFooter();
      return;
    }

    const ctrl = createFooterScrollOut(footer);
    footerScrollOut.cache = ctrl.cache;
    footerScrollOut.update = ctrl.update;

    const sync = () => {
      updatePageHeight();
      footerScrollOut.cache();
      footerScrollOut.update();
    };

    sync();
    requestAnimationFrame(() => requestAnimationFrame(sync));

    window.addEventListener('scroll', () => footerScrollOut.update(), { passive: true });
    window.addEventListener('resize', sync, { passive: true });
  }

  window.FooterNav = { init: initFooterNav, update: () => footerScrollOut.update(), sync: () => {
    updatePageHeight();
    footerScrollOut.cache();
    footerScrollOut.update();
  }};

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooterNav);
  } else {
    initFooterNav();
  }
})();
