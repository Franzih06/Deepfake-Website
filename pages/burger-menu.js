(function initBurgerMenu() {
  const MENU_HTML = `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <defs>
        <filter id="burger-goo" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur"/>
          <feColorMatrix in="blur" mode="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 24 -12" result="goo"/>
          <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
        </filter>
        <filter id="burger-icon-goo" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
          <feColorMatrix in="blur" mode="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 15 -6" result="goo"/>
          <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
        </filter>
      </defs>
    </svg>

    <div class="menu-wrap" id="burger-menu">
      <div class="shapes">
        <div class="burger"></div>
        <div class="teaser"></div>
        <div class="panel"></div>
      </div>

      <div class="content">
        <button class="burger-btn" id="burger-toggle" type="button" aria-label="Menü öffnen" aria-expanded="false">
          <span class="burger-icon" aria-hidden="true">
            <i class="burger-bar burger-bar--1"></i>
            <i class="burger-bar burger-bar--2"></i>
            <i class="burger-bar burger-bar--3"></i>
            <svg class="burger-x" viewBox="0 0 36 40"><path fill="currentColor" d="M7 6.5C7 6.77614 7.22386 7 7.5 7H9.5C9.77614 7 10 7.22386 10 7.5V9.5C10 9.77614 10.2239 10 10.5 10H12.5C12.7761 10 13 10.2239 13 10.5V12.5C13 12.7761 13.2239 13 13.5 13H15.5C15.7761 13 16 13.2239 16 13.5V15.5C16 15.7761 16.2239 16 16.5 16H20.5C20.7761 16 21 15.7761 21 15.5V13.5C21 13.2239 21.2239 13 21.5 13H23.5C23.7761 13 24 12.7761 24 12.5V10.5C24 10.2239 24.2239 10 24.5 10H26.5C26.7761 10 27 9.77614 27 9.5V7.5C27 7.22386 27.2239 7 27.5 7H29.5C29.7761 7 30 6.77614 30 6.5V4.5C30 4.22386 30.2239 4 30.5 4H33.5C33.7761 4 34 4.22386 34 4.5V7.5C34 7.77614 33.7761 8 33.5 8H31.5C31.2239 8 31 8.22386 31 8.5V10.5C31 10.7761 30.7761 11 30.5 11H28.5C28.2239 11 28 11.2239 28 11.5V13.5C28 13.7761 27.7761 14 27.5 14H25.5C25.2239 14 25 14.2239 25 14.5V16.5C25 16.7761 24.7761 17 24.5 17H22.5C22.2239 17 22 17.2239 22 17.5V21.5C22 21.7761 22.2239 22 22.5 22H24.5C24.7761 22 25 22.2239 25 22.5V24.5C25 24.7761 25.2239 25 25.5 25H27.5C27.7761 25 28 25.2239 28 25.5V27.5C28 27.7761 28.2239 28 28.5 28H30.5C30.7761 28 31 28.2239 31 28.5V30.5C31 30.7761 31.2239 31 31.5 31H33.5C33.7761 31 34 31.2239 34 31.5V34.5C34 34.7761 33.7761 35 33.5 35H30.5C30.2239 35 30 34.7761 30 34.5V32.5C30 32.2239 29.7761 32 29.5 32H27.5C27.2239 32 27 31.7761 27 31.5V29.5C27 29.2239 26.7761 29 26.5 29H24.5C24.2239 29 24 28.7761 24 28.5V26.5C24 26.2239 23.7761 26 23.5 26H21.5C21.2239 26 21 25.7761 21 25.5V23.5C21 23.2239 20.7761 23 20.5 23H16.5C16.2239 23 16 23.2239 16 23.5V25.5C16 25.7761 15.7761 26 15.5 26H13.5C13.2239 26 13 26.2239 13 26.5V28.5C13 28.7761 12.7761 29 12.5 29H10.5C10.2239 29 10 29.2239 10 29.5V31.5C10 31.7761 9.77614 32 9.5 32H7.5C7.22386 32 7 32.2239 7 32.5V34.5C7 34.7761 6.77614 35 6.5 35H3.5C3.22386 35 3 34.7761 3 34.5V31.5C3 31.2239 3.22386 31 3.5 31H5.5C5.77614 31 6 30.7761 6 30.5V28.5C6 28.2239 6.22386 28 6.5 28H8.5C8.77614 28 9 27.7761 9 27.5V25.5C9 25.2239 9.22386 25 9.5 25H11.5C11.7761 25 12 24.7761 12 24.5V22.5C12 22.2239 12.2239 22 12.5 22H14.5C14.7761 22 15 21.7761 15 21.5V17.5C15 17.2239 14.7761 17 14.5 17H12.5C12.2239 17 12 16.7761 12 16.5V14.5C12 14.2239 11.7761 14 11.5 14H9.5C9.22386 14 9 13.7761 9 13.5V11.5C9 11.2239 8.77614 11 8.5 11H6.5C6.22386 11 6 10.7761 6 10.5V8.5C6 8.22386 5.77614 8 5.5 8H3.5C3.22386 8 3 7.77614 3 7.5V4.5C3 4.22386 3.22386 4 3.5 4H6.5C6.77614 4 7 4.22386 7 4.5V6.5Z"/></svg>
          </span>
        </button>

        <ul class="nav">
          <li><a href="../index.html" data-page="index.html">Startseite</a></li>
          <li><a href="ki.html" data-page="ki.html">Deepfakes &amp; KI</a></li>
          <li><a href="instagram.html" data-page="instagram.html">Instagram</a></li>
          <li class="is-soon"><a href="tiktok.html" data-page="tiktok.html">Tiktok</a></li>
          <li class="is-soon"><a href="tinder.html" data-page="tinder.html">Tinder</a></li>
        </ul>
      </div>
    </div>
  `;

  if (!document.getElementById('burger-menu')) {
    document.body.insertAdjacentHTML('afterbegin', MENU_HTML);
  }

  const menu = document.getElementById('burger-menu');
  const toggle = document.getElementById('burger-toggle');
  if (!menu || !toggle) return;

  // Aktuelle Seite im Menü hervorheben
  const currentFile = location.pathname.split('/').pop() || 'index.html';
  menu.querySelectorAll('.nav a[data-page]').forEach(a => {
    if (a.dataset.page === currentFile) {
      a.classList.add('is-current');
      a.setAttribute('aria-current', 'page');
    }
  });

  toggle.addEventListener('mouseenter', () => menu.classList.add('hover'));
  toggle.addEventListener('mouseleave', () => menu.classList.remove('hover'));

  let morphTimer = null;

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');

    // Goo-Filter nur während der Morph-Bewegung (Linien ↔ X) einschalten –
    // danach aus, damit die Pixel-Optik im Ruhezustand scharf bleibt
    window.clearTimeout(morphTimer);
    menu.classList.add('is-morphing');
    morphTimer = window.setTimeout(() => {
      menu.classList.remove('is-morphing');
    }, 520);
  });
})();
