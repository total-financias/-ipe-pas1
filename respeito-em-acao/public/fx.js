(() => {
  'use strict';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = document.querySelector('.nav');
  const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]:not(.btn)'));
  let ticking = false;

  // menu ganha um leve desfoque ao rolar
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { if (nav) nav.classList.toggle('scrolled', window.scrollY > 16); ticking = false; });
  }, { passive: true });

  if (!('IntersectionObserver' in window)) return;

  // menu: sublinha a seção em que você está
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((l) => l.classList.remove('active'));
      const a = map.get(e.target.id);
      if (a) a.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  if (reduce) return;

  // blocos entram com um deslize curto; o texto já é legível desde o começo
  const items = document.querySelectorAll('.sec-side, .title, .subtitle, .lead, .prose p, .law, .def, .epi-intro p, .epi-list li, .box, .term, .q-list li, .reflect-close, .prayer, .care-copy p, .note, .care-art, .step, .help-list li, .wall-banner, .wall-form, .pull, .person, .people-close');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
  items.forEach((t) => { t.classList.add('rv'); io.observe(t); });
})();
