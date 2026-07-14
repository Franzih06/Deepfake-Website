/**
 * 16:9-Responsive-Skalierung für Canvas-Unterseiten.
 * Scale = min(Breite/1440, Höhe/810) → kein Über-Zoom auf Ultrawide.
 */
(function () {
  'use strict';

  const CANVAS_W = 1440;
  const CANVAS_VIEW_H = CANVAS_W * 9 / 16;

  function getScale() {
    const sx = window.innerWidth / CANVAS_W;
    const sy = window.innerHeight / CANVAS_VIEW_H;
    return Math.min(sx, sy) || 1;
  }

  function getOffsetX() {
    return Math.max(0, (window.innerWidth - CANVAS_W * getScale()) / 2);
  }

  function sync() {
    const root = document.documentElement;
    root.style.setProperty('--page-scale', String(getScale()));
    root.style.setProperty('--page-offset-x', `${getOffsetX()}px`);
  }

  window.PageScale = {
    CANVAS_W,
    CANVAS_VIEW_H,
    getScale,
    getOffsetX,
    sync,
  };

  sync();
  window.addEventListener('resize', sync, { passive: true });
})();
