(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  // ── barra de progresso + nav que muda ao rolar ──
  const bar = $('.progress span');
  const nav = $('.nav');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = root.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
      if (!reduce) parallax();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  // ── parallax suave no banner do mural ──
  const banner = $('.wall-banner img');
  function parallax() {
    if (!banner) return;
    const box = banner.parentElement.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) return;
    const p = (box.top + box.height / 2 - window.innerHeight / 2) / window.innerHeight;
    banner.style.transform = `translateY(${Math.round(p * -36)}px) scale(1.12)`;
  }

  // ── menu: destaca a seção que está na tela ──
  const links = $$('.nav-links a[href^="#"]:not(.btn)');
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((l) => l.classList.remove('active'));
          const a = map.get(e.target.id);
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  // ── entrada suave dos blocos ao rolar (o texto fica legível desde o início) ──
  const targets = $$('.sec-side, .title, .subtitle, .lead, .prose p, .law, .stat, .def, .epi-intro p, .epi-list li, .box, .term, .q-list li, .reflect-close, .prayer, .care-copy p, .note, .care-art, .step, .help-list li, .wall-banner, .wall-form, .footer-grid, .pull, .people-close');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((t, i) => {
      t.classList.add('rv');
      if (t.matches('.stat, .step, .term, .epi-list li, .q-list li')) t.style.transitionDelay = `${(i % 3) * 70}ms`;
      io.observe(t);
    });
  }

  // ── números que sobem ──
  const fmt = (n, d) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const counters = $$('[data-count]');
  if ('IntersectionObserver' in window && !reduce) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        const el = e.target, end = parseFloat(el.dataset.count), d = parseInt(el.dataset.dec || '0', 10), t0 = performance.now(), dur = 1400;
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
          el.textContent = fmt(end * ease, d);
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => co.observe(c));
  }

  // ── perguntas: a que está no centro da tela ganha destaque ──
  const qs = $$('.q-list li');
  if ('IntersectionObserver' in window && !reduce && qs.length) {
    const qo = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-active', e.isIntersecting));
    }, { rootMargin: '-38% 0px -38% 0px' });
    qs.forEach((q) => qo.observe(q));
  }

  // ── carrossel de pessoas: setas, arrastar com o mouse, barra de progresso ──
  const track = $('#people');
  if (track) {
    const prog = $('.people-progress i');
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const k = max > 0 ? track.scrollLeft / max : 0;
      if (prog) { prog.style.width = `${Math.max(12, (track.clientWidth / track.scrollWidth) * 100)}%`; prog.style.transform = `translateX(${k * ((100 / Math.max(12, (track.clientWidth / track.scrollWidth) * 100)) - 1) * 100}%)`; }
    };
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    $$('.ctrl').forEach((b) => b.addEventListener('click', () => {
      const card = track.querySelector('.person');
      const w = card ? card.getBoundingClientRect().width + 28 : 320;
      track.scrollBy({ left: Number(b.dataset.dir) * w, behavior: reduce ? 'auto' : 'smooth' });
    }));
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { track.scrollBy({ left: 320, behavior: 'smooth' }); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { track.scrollBy({ left: -320, behavior: 'smooth' }); e.preventDefault(); }
    });
    let down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; track.classList.add('dragging');
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => { down = false; track.classList.remove('dragging'); });
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  }

  // ── abraço: pequena explosão de corações ──
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.hug');
    if (!b || b.disabled || reduce) return;
    const r = b.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
      const s = document.createElement('span');
      s.className = 'burst';
      s.textContent = '♥';
      const a = (Math.PI * 2 * i) / 8 + Math.random() * 0.5, d = 34 + Math.random() * 26;
      s.style.left = `${r.left + r.width / 2}px`;
      s.style.top = `${r.top + r.height / 2}px`;
      s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      s.style.setProperty('--dy', `${Math.sin(a) * d - 18}px`);
      document.body.append(s);
      setTimeout(() => s.remove(), 900);
    }
  }, true);

  onScroll();
})();
