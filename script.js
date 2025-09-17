AOS.init({
    duration: 1000,
    easing: 'ease-out',
    once: false // <= important, ça rejoue à chaque fois que tu scrolles vers la section
   });
   
   
   
   
   /* =========================
     Parallax doux sur les textes
     =========================
     - Ajoute class="parallax-text" et data-speed="0.2" (≈ lente) à 0.5 (≈ un peu plus visible)
   */
   const pxEls = Array.from(document.querySelectorAll('.parallax-text'));
   function onScrollParallax() {
    const viewportH = window.innerHeight;
    const y = window.scrollY;
   
   
    pxEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      const speed = parseFloat(el.dataset.speed || '0.2');
   
   
      // position de l’élément dans la page
      const elTop = rect.top + y;
   
   
      // distance de l’élément par rapport au viewport center
      const center = y + viewportH / 2;
      const delta = (elTop - center) * speed;
   
   
      // translateY subtil (limité)
      const clamped = Math.max(Math.min(delta, 40), -40);
      el.style.transform = `translateY(${clamped}px)`;
    });
   }
   
   
   // scroll + resize + raf au démarrage
   let ticking = false;
   function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        onScrollParallax();
        ticking = false;
      });
      ticking = true;
    }
   }
   window.addEventListener('scroll', onScroll, { passive: true });
   window.addEventListener('resize', onScroll);
   window.addEventListener('load', () => {
    onScrollParallax();
   });
   
   
   /* =========================
     Transitions entre pages (fade)
     =========================
     - Fait un fondu quand on clique sur un lien interne vers une page projet
     - Et fondu d’entrée à l’arrivée
   */
   document.addEventListener('DOMContentLoaded', () => {
    // fondu d’entrée
    document.body.classList.remove('fade-out');
   
   
    // liens qui déclenchent le fondu de sortie
    const links = document.querySelectorAll('a.page-link, a[href$=".html"]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const url = link.getAttribute('href');
        // ignore anchors #...
        if (!url || url.startsWith('#')) return;
   
   
        e.preventDefault();
        document.body.classList.add('fade-out');
        // laisse le temps au fade puis navigue
        setTimeout(() => { window.location.href = url; }, 220);
      });
    });
   });
   const hero = document.querySelector('.hero');
   const work = document.querySelector('.work');
   
   
   window.addEventListener('scroll', () => {
    const trigger = window.innerHeight * 0.6; // déclenche à ~60% de l’écran
    if (window.scrollY > trigger) {
      hero.classList.add('fade-out');
      work.classList.add('fade-in');
    } else {
      hero.classList.remove('fade-out');
      work.classList.remove('fade-in');
    }
   });
   AOS.init({
    duration: 900,
    easing: 'ease-out',
    once: true,     // l’anim se joue une fois
    offset: 10,     // déclenche quasi dès que le footer entre dans l’écran
    mirror: false
   });
   const header = document.querySelector('.site-header');
   const solidOn = () => header.classList.add('site-header--solid');
   const solidOff = () => header.classList.remove('site-header--solid');
   
   
   let lastY = 0;
   addEventListener('scroll', () => {
    const y = scrollY;
    (y > 40) ? solidOn() : solidOff();
    lastY = y;
   }, {passive:true});
   