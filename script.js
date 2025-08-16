/* KingdomCraft interactivity */
(function() {
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.getElementById('site-nav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Copy IP helpers
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try { document.execCommand('copy'); return true; } catch (e) { return false; }
      finally { document.body.removeChild(textarea); }
    }
  }

  const ip = (document.getElementById('server-ip')?.textContent || 'play.kingdomcraft.gg').trim();
  const copyIpBtn = document.getElementById('copy-ip-btn');
  if (copyIpBtn) {
    copyIpBtn.addEventListener('click', async () => {
      const ok = await copyText(ip);
      const prev = copyIpBtn.textContent;
      if (ok) {
        const label = copyIpBtn.getAttribute('data-copied-label') || 'Copied!';
        copyIpBtn.textContent = label;
        copyIpBtn.disabled = true;
        setTimeout(() => { copyIpBtn.textContent = prev; copyIpBtn.disabled = false; }, 1400);
      }
    });
  }
  document.querySelectorAll('.copy-inline').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy') || ip;
      const ok = await copyText(text);
      if (ok) {
        const prev = btn.textContent;
        btn.textContent = 'Copied!';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = prev; btn.disabled = false; }, 1400);
      }
    });
  });

  // Tilt effect for feature cards
  function bindTilt(card) {
    const dampen = 30; // lower is more tilt
    let frame = null;
    function onMove(e) {
      const bounds = card.getBoundingClientRect();
      const px = (e.clientX - bounds.left) / bounds.width;
      const py = (e.clientY - bounds.top) / bounds.height;
      const rx = (0.5 - py) * dampen;
      const ry = (px - 0.5) * dampen;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
          frame = null;
        });
      }
    }
    function onLeave() {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)';
    }
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('blur', onLeave);
  }
  if (!prefersReducedMotion) {
    document.querySelectorAll('[data-tilt]').forEach(el => bindTilt(el));
  }

  // Countdown: Next Saturday 18:00 UTC by default, or data-event-iso override
  const uhcSection = document.querySelector('#uhc');
  const cdEls = {
    d: document.getElementById('cd-days'),
    h: document.getElementById('cd-hours'),
    m: document.getElementById('cd-mins'),
    s: document.getElementById('cd-secs'),
  };
  const dateDisplay = document.getElementById('uhc-date-display');

  function computeNextUhcDate() {
    const iso = uhcSection?.getAttribute('data-event-iso');
    if (iso) {
      const dt = new Date(iso);
      if (!isNaN(dt.valueOf())) return dt;
    }
    const now = new Date();
    const day = now.getUTCDay(); // 0..6 Sun..Sat
    const hour = now.getUTCHours();
    const targetHour = 18; // 18:00 UTC
    let daysUntil = (6 - day + 7) % 7; // to Saturday
    if (daysUntil === 0 && hour >= targetHour) daysUntil = 7;
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntil, targetHour, 0, 0));
    return next;
  }

  function formatDateForUser(d) {
    try {
      const dtf = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' });
      return dtf.format(d);
    } catch (_) {
      return d.toLocaleString();
    }
  }

  let target = computeNextUhcDate();
  function updateCountdown() {
    const now = new Date();
    const diffMs = target - now;
    if (diffMs <= 0) {
      cdEls.d.textContent = '00';
      cdEls.h.textContent = '00';
      cdEls.m.textContent = '00';
      cdEls.s.textContent = '00';
      if (dateDisplay) dateDisplay.textContent = 'Live Now';
      return;
    }
    const sec = Math.floor(diffMs / 1000);
    const days = Math.floor(sec / 86400);
    const hrs = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    cdEls.d.textContent = String(days).padStart(2, '0');
    cdEls.h.textContent = String(hrs).padStart(2, '0');
    cdEls.m.textContent = String(mins).padStart(2, '0');
    cdEls.s.textContent = String(secs).padStart(2, '0');
  }
  if (dateDisplay) {
    dateDisplay.dateTime = target.toISOString();
    dateDisplay.textContent = formatDateForUser(target);
  }
  updateCountdown();
  const cdTimer = setInterval(updateCountdown, 1000);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') updateCountdown();
  });

  // Particles: floating embers in hero
  const canvas = document.getElementById('particles-canvas');
  if (canvas && !prefersReducedMotion) {
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, dpr = Math.max(1, window.devicePixelRatio || 1);
    let particles = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
      generateParticles();
    }

    function generateParticles() {
      const count = Math.floor((width * height) / 18000); // density-based
      particles = Array.from({ length: count }).map(() => spawn());
    }

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function spawn() {
      return {
        x: rand(0, width),
        y: rand(height * 0.2, height),
        r: rand(0.7, 2.2),
        vy: rand(-0.25, -0.8),
        vx: rand(-0.15, 0.15),
        a: rand(0.25, 0.9),
        hue: rand(42, 52), // golden
      };
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.a *= 0.9995;
        if (p.y < -10 || p.a < 0.02) Object.assign(p, spawn(), { y: height + 10 });
        if (p.x < -10) p.x = width + 10; else if (p.x > width + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 85%, 62%, ${p.a})`;
        ctx.shadowBlur = 12; ctx.shadowColor = `hsla(${p.hue}, 85%, 52%, ${p.a * 0.85})`;
        ctx.fill();
      }
      anim = requestAnimationFrame(draw);
    }

    let anim = null;
    resize();
    draw();
    window.addEventListener('resize', () => { cancelAnimationFrame(anim); resize(); draw(); });
  }

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();