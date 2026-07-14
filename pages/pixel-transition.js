/* Pixel-Transition – Seitenübergang im Pixel-Look der Seite
   ───────────────────────────────────────────────────────────
   Prinzip: ein Raster gerundeter Kacheln skaliert gestaffelt (zufällig) auf und
   deckt die Seite zu, bevor navigiert wird. Auf der neuen Seite startet das
   Raster gedeckt und deckt gestaffelt wieder auf → nahtloser Pixel-Übergang.

   Damit auf der neuen Seite kein Aufblitzen entsteht, MUSS dieses Script im
   <head> (ohne defer) laufen: es baut das Overlay gedeckt auf, bevor der Body
   gerendert wird. */
(function () {
  const CELL = 74;            // Kachelgröße in px
  const STAGGER_MAX = 460;    // ms Gesamt-Versatz von oberster bis unterster Zeile
  const ROW_JITTER = 60;      // ms leichte Streuung innerhalb einer Zeile (Pixel-Textur)
  const CELL_DUR = 340;       // ms – muss zur transition-duration in der CSS passen
  const BUFFER = 60;          // ms Sicherheitspuffer
  const FLAG = 'pixelTransition';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return; // Ohne Animation: normale Navigation

  let overlay = null;
  let cells = [];
  let gridCols = 1;
  let gridRows = 1;

  function layoutCells() {
    gridCols = Math.max(1, Math.ceil(window.innerWidth / CELL));
    gridRows = Math.max(1, Math.ceil(window.innerHeight / CELL));
    overlay.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
    overlay.style.gridTemplateRows = `repeat(${gridRows}, 1fr)`;

    const frag = document.createDocumentFragment();
    cells = [];
    for (let i = 0; i < gridCols * gridRows; i += 1) {
      const cell = document.createElement('span');
      cell.className = 'pixel-trans__cell';
      frag.appendChild(cell);
      cells.push(cell);
    }
    overlay.replaceChildren(frag);
  }

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'pixel-trans';
    overlay.setAttribute('aria-hidden', 'true');
    layoutCells();
    (document.body || document.documentElement).appendChild(overlay);
  }

  /* Vertikal, von oben nach unten: Verzögerung steigt mit der Zeile,
     plus leichte Streuung pro Kachel für die Pixel-Textur. */
  function setCellDelays() {
    const denom = Math.max(1, gridRows - 1);
    cells.forEach((cell, i) => {
      const row = Math.floor(i / gridCols);
      const d = (row / denom) * STAGGER_MAX + Math.random() * ROW_JITTER;
      cell.style.setProperty('--d', `${Math.round(d)}ms`);
    });
  }

  const TOTAL_MS = STAGGER_MAX + ROW_JITTER + CELL_DUR + BUFFER;

  function cover(done) {
    setCellDelays();
    overlay.hidden = false;
    overlay.classList.remove('is-instant');
    void overlay.offsetWidth;            // Reflow → Klassenwechsel animiert sicher
    overlay.classList.add('is-covered');
    window.setTimeout(done, TOTAL_MS);
  }

  function reveal() {
    setCellDelays();
    overlay.classList.remove('is-instant');
    void overlay.offsetWidth;
    overlay.classList.remove('is-covered');
    window.setTimeout(() => { overlay.hidden = true; }, TOTAL_MS);
  }

  function coverInstant() {
    overlay.hidden = false;
    overlay.classList.add('is-instant', 'is-covered');
    void overlay.offsetWidth;
  }

  function isInternalLink(a) {
    if (!a || !a.getAttribute('href')) return false;
    let url;
    try { url = new URL(a.href, location.href); } catch { return false; }
    if (url.origin !== location.origin) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    if (url.pathname === location.pathname) return false; // gleiche Seite / Anker
    return /\.html?$/.test(url.pathname);
  }

  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a[href]');
    if (!isInternalLink(link)) return;
    e.preventDefault();
    sessionStorage.setItem(FLAG, '1');
    cover(() => { location.href = link.href; });
  }

  // Zurück-Navigation aus dem bfcache: Overlay sofort verstecken
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && overlay) {
      overlay.hidden = true;
      overlay.classList.remove('is-covered', 'is-instant');
    }
  });

  window.addEventListener('resize', () => {
    if (overlay && overlay.hidden) layoutCells();
  }, { passive: true });

  document.addEventListener('click', onClick);

  buildOverlay();

  // Betritt die Seite über eine Transition? → gedeckt starten und aufdecken
  if (sessionStorage.getItem(FLAG)) {
    sessionStorage.removeItem(FLAG);
    coverInstant();
    const start = () => requestAnimationFrame(() => requestAnimationFrame(reveal));
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  } else {
    overlay.hidden = true;
  }
})();
