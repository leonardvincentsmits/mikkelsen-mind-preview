/* MIKKELSEN mind — progressive enhancement. The page works fully without JS. */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Header: glass on scroll, hide on scroll down ---------- */
  const header = document.querySelector('[data-header]');
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 12);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (!header.classList.contains('is-open')) {
      if (goingDown && y > 480) header.classList.add('is-hidden');
      else if (goingUp || y < 480) header.classList.remove('is-hidden');
    }
    lastY = y;
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );
  onScroll();

  // Keep the bar visible while keyboard users tab through it
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* ---------- Mobile menu ---------- */
  const menu = document.querySelector('[data-menu]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const toggleLabel = document.querySelector('[data-menu-label]');
  const main = document.querySelector('main');
  const footer = document.querySelector('footer');

  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? 'Luk' : 'Menu';
    document.body.classList.toggle('is-locked', open);
    [main, footer].forEach((el) => el && (el.inert = open));
    if (open) {
      header.classList.remove('is-hidden');
      menu.querySelector('a')?.focus({ preventScroll: true });
    }
  };

  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });

  /* ---------- Current-section highlight in nav ---------- */
  const navLinks = [...document.querySelectorAll('[data-nav-link]')];
  const sections = navLinks
    .map((a) => document.getElementById(a.hash.slice(1)))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => {
            const on = a.hash === `#${entry.target.id}`;
            a.classList.toggle('is-current', on);
            if (on) a.setAttribute('aria-current', 'location');
            else a.removeAttribute('aria-current');
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Motifs: animate only while visible ---------- */
  const motifs = document.querySelectorAll('.motif');
  if (!('IntersectionObserver' in window)) {
    motifs.forEach((el) => el.classList.add('is-playing'));
  } else {
    const play = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-playing', entry.isIntersecting));
    });
    motifs.forEach((el) => play.observe(el));
  }

  /* ---------- Final CTA: a field of needles finding one direction ---------- */
  const canvas = document.querySelector('[data-field]');
  const ctx = canvas && canvas.getContext('2d');
  if (ctx) {
    const area = canvas.closest('.final-cta') || canvas.parentElement;
    let w = 0;
    let h = 0;
    let needles = [];
    const target = { x: 0, y: 0 }; // where the needles point (eased)
    let pointer = null; // live mouse position inside the section, if any
    let visible = false;
    let raf = 0;
    let last = 0;
    let t0 = null; // idle path starts at the top of its lap on the first frame

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gap = w < 640 ? 34 : 44;
      const cols = Math.ceil(w / gap);
      const rows = Math.ceil(h / gap);
      const ox = (w - (cols - 1) * gap) / 2;
      const oy = (h - (rows - 1) * gap) / 2;
      const old = needles;
      needles = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          needles.push({ x: ox + c * gap, y: oy + r * gap, a: old.length ? -Math.PI / 2 : Math.random() * Math.PI * 2 });
        }
      }
      if (!target.x) {
        target.x = w / 2;
        target.y = h * 0.15;
      }
    };

    // When nobody is steering, the node circles slowly around the text block
    // (one lap ≈ 80 s, with a slight breath in the radius) and never crosses it
    const idle = (t) => {
      const a = t * 0.0000785 - Math.PI / 2;
      const breath = 1 + Math.sin(t * 0.00023) * 0.05;
      return {
        x: w / 2 + Math.cos(a) * w * 0.38 * breath,
        y: h * 0.52 + Math.sin(a) * h * 0.33 * breath,
      };
    };

    // `fixed` (a point) draws a settled frame aimed straight at it
    const draw = (t, fixed) => {
      const dt = last ? Math.min(t - last, 64) : 16.7;
      last = t;
      const settle = Boolean(fixed);
      if (t0 === null && !fixed) t0 = t;
      const goal = fixed || pointer || idle(t - t0);
      const follow = settle ? 1 : 1 - Math.pow(0.95, dt / 16.7);
      target.x += (goal.x - target.x) * follow;
      target.y += (goal.y - target.y) * follow;
      const turn = settle ? 1 : 1 - Math.pow(0.93, dt / 16.7);
      const reach = Math.max(w, h) * 0.28;

      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      ctx.lineWidth = 1;
      for (const n of needles) {
        const dx = target.x - n.x;
        const dy = target.y - n.y;
        const dist = Math.hypot(dx, dy);
        let diff = Math.atan2(dy, dx) - n.a;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // shortest way round
        n.a += diff * turn;
        const near = Math.exp(-((dist / reach) ** 2));
        if (dist < 14) continue; // keep the node itself clear
        // fade in from the dark top so the field has no visible starting row
        const edge = n.y / (h * 0.16);
        const fade = edge >= 1 ? 1 : edge <= 0 ? 0 : edge * edge * (3 - 2 * edge);
        if (fade === 0) continue;
        const len = 5 + near * 4; // half-length in px
        const cx = Math.cos(n.a) * len;
        const cy = Math.sin(n.a) * len;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.14 + near * 0.5) * fade})`;
        ctx.beginPath();
        ctx.moveTo(n.x - cx, n.y - cy);
        ctx.lineTo(n.x + cx, n.y + cy);
        ctx.stroke();
      }
      // The node everything turns towards
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
      ctx.beginPath();
      ctx.arc(target.x, target.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f5f5f7';
      ctx.beginPath();
      ctx.arc(target.x, target.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    };

    const loop = (t) => {
      draw(t, false);
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (!raf && visible && !reduceMotion.matches) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };
    // Reduced motion: one composed still frame, everything pointing "north" above the label
    const still = () => {
      pointer = null;
      draw(0, { x: w / 2, y: h * 0.13 });
    };

    layout();
    if (reduceMotion.matches) still();

    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        layout();
        if (reduceMotion.matches) still();
        else if (!raf) draw(performance.now());
      }).observe(canvas);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        start();
      }).observe(canvas);
    } else {
      visible = true;
      start();
    }
    document.addEventListener('visibilitychange', start);
    reduceMotion.addEventListener('change', () => (reduceMotion.matches ? still() : start()));

    area.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || reduceMotion.matches) return;
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    });
    area.addEventListener('pointerleave', () => {
      pointer = null;
    });
  }
})();
