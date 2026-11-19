(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const COLORS = ['#b94e2e', '#e0a23b', '#f6d36b', '#8db07a', '#f2c4ae'];

  // a roda de pessoas ganha um círculo e gira devagar
  const heroImg = $('.hero-art img');
  if (heroImg && !heroImg.closest('.ring-wrap')) {
    const w = document.createElement('div');
    w.className = 'ring-wrap';
    heroImg.parentNode.insertBefore(w, heroImg);
    w.appendChild(heroImg);
    heroImg.classList.add('spin');
  }

  // barra de progresso, menu que acompanha, parallax
  const bar = $('.progress span'), nav = $('.nav'), banner = $('.wall-banner img');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = root.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
      if (banner && !reduce) {
        const r = banner.parentElement.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) {
          const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
          banner.style.transform = `translateY(${Math.round(p * -40)}px) scale(1.12)`;
        }
      }
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  if (!('IntersectionObserver' in window)) return;

  // menu: destaca a seção atual
  const links = $$('.nav-links a[href^="#"]:not(.btn)');
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

  // números que sobem
  const fmt = (n, d) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const co = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      co.unobserve(e.target);
      const el = e.target, end = parseFloat(el.dataset.count), d = parseInt(el.dataset.dec || '0', 10), t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 1500), ease = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(end * ease, d);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((c) => co.observe(c));

  // perguntas: a do meio da tela ganha foco
  const qo = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-active', e.isIntersecting));
  }, { rootMargin: '-40% 0px -40% 0px' });
  $$('.q-list li').forEach((q) => qo.observe(q));

  // inclinação 3D que segue o mouse
  if (window.matchMedia('(hover: hover)').matches) {
    $$('.concept, .person').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
  }

  // ondinha nos botões
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('.btn, .opt');
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height);
    const d = document.createElement('span');
    d.className = 'ripple';
    d.style.width = d.style.height = `${s}px`;
    d.style.left = `${e.clientX - r.left - s / 2}px`;
    d.style.top = `${e.clientY - r.top - s / 2}px`;
    b.appendChild(d);
    setTimeout(() => d.remove(), 650);
  }, true);

  // abraço: corações saem do botão
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.hug');
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect();
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('span');
      s.className = 'burst';
      s.textContent = '♥';
      const a = (Math.PI * 2 * i) / 9 + Math.random() * 0.5, d = 36 + Math.random() * 30;
      s.style.left = `${r.left + r.width / 2}px`;
      s.style.top = `${r.top + r.height / 2}px`;
      s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      s.style.setProperty('--dy', `${Math.sin(a) * d - 20}px`);
      document.body.append(s);
      setTimeout(() => s.remove(), 950);
    }
  }, true);

  // confete quando o placar é alto
  const quiz = $('#quiz');
  if (quiz) {
    new MutationObserver(() => {
      const b = $('.score .big b', quiz);
      if (!b || quiz.dataset.done === b.textContent) return;
      const total = $$('.dots span', quiz).length;
      if (parseInt(b.textContent, 10) >= total - 1) {
        quiz.dataset.done = b.textContent;
        const r = quiz.getBoundingClientRect(), cx = r.left + r.width / 2, cy = Math.min(Math.max(r.top + 80, 120), window.innerHeight - 160);
        for (let i = 0; i < 46; i++) {
          const c = document.createElement('span');
          c.className = 'confetti';
          c.style.background = COLORS[i % COLORS.length];
          c.style.left = `${cx}px`;
          c.style.top = `${cy}px`;
          const a = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 260;
          c.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
          c.style.setProperty('--dy', `${Math.sin(a) * dist + 160}px`);
          c.style.setProperty('--rot', `${Math.round(Math.random() * 720 - 360)}deg`);
          document.body.append(c);
          setTimeout(() => c.remove(), 1900);
        }
      } else { quiz.dataset.done = b.textContent; }
    }).observe(quiz, { childList: true, subtree: true });
  }
})();
