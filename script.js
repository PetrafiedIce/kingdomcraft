/* KingdomCraft interactivity + configurable settings (server-backed) */
(function() {
  const STORAGE_KEY = 'kc:config';
  const defaultConfig = {
    ip: 'play.kingdomcraft.net',
    discord: 'https://discord.gg/kingdomcraft',
    tagline: 'Forge Your Legacy in Battle!',
    eventISO: ''
  };

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultConfig };
      return { ...defaultConfig, ...JSON.parse(raw) };
    } catch (_) { return { ...defaultConfig }; }
  }
  function saveLocal(cfg) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch(_) {} }

  async function fetchConfig() {
    try { const res = await fetch('/api/config', { cache: 'no-store' }); if (!res.ok) throw new Error('bad'); return await res.json(); }
    catch(_) { return loadLocal(); }
  }

  let currentConfig = loadLocal();

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

  // Copy helpers
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (_) {
      const textarea = document.createElement('textarea');
      textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0';
      document.body.appendChild(textarea); textarea.focus(); textarea.select();
      try { document.execCommand('copy'); return true; } catch (e) { return false; }
      finally { document.body.removeChild(textarea); }
    }
  }

  // Config application
  const taglineEl = document.getElementById('tagline');
  const serverIpHeroEl = document.getElementById('server-ip');
  const serverIpJoinEl = document.getElementById('server-ip-join');
  const copyIpBtn = document.getElementById('copy-ip-btn');
  const discordLinks = Array.from(document.querySelectorAll('a.discord-link'));
  const uhcSection = document.getElementById('uhc');
  const dateDisplay = document.getElementById('uhc-date-display');
  const cdEls = {
    d: document.getElementById('cd-days'),
    h: document.getElementById('cd-hours'),
    m: document.getElementById('cd-mins'),
    s: document.getElementById('cd-secs'),
  };

  function isTruthyString(v) { return typeof v === 'string' && v.trim().length > 0; }
  function formatDateForUser(d) { try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(d); } catch(_) { return d.toLocaleString(); } }

  function computeDefaultUhcDate() {
    const now = new Date();
    const day = now.getUTCDay();
    const hour = now.getUTCHours();
    const targetHour = 18; // 18:00 UTC Saturdays
    let daysUntil = (6 - day + 7) % 7;
    if (daysUntil === 0 && hour >= targetHour) daysUntil = 7;
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntil, targetHour, 0, 0));
  }

  let target = null;
  function updateTargetAndDisplay() {
    const iso = currentConfig.eventISO;
    if (uhcSection) {
      if (isTruthyString(iso)) uhcSection.setAttribute('data-event-iso', iso);
      else uhcSection.removeAttribute('data-event-iso');
    }
    if (isTruthyString(iso)) {
      const dt = new Date(iso);
      target = isNaN(dt.valueOf()) ? computeDefaultUhcDate() : dt;
    } else {
      target = computeDefaultUhcDate();
    }
    if (dateDisplay) {
      dateDisplay.dateTime = target.toISOString();
      dateDisplay.textContent = formatDateForUser(target);
    }
  }

  function applyConfig(cfg) {
    if (taglineEl && isTruthyString(cfg.tagline)) taglineEl.textContent = cfg.tagline;
    if (serverIpHeroEl && isTruthyString(cfg.ip)) serverIpHeroEl.textContent = cfg.ip;
    if (serverIpJoinEl && isTruthyString(cfg.ip)) serverIpJoinEl.textContent = cfg.ip;
    if (discordLinks.length) discordLinks.forEach(a => { if (isTruthyString(cfg.discord)) a.href = cfg.discord; });
    document.querySelectorAll('.copy-inline').forEach(btn => { if (isTruthyString(cfg.ip)) btn.setAttribute('data-copy', cfg.ip); });
    if (copyIpBtn && isTruthyString(cfg.ip)) copyIpBtn.setAttribute('data-copy', cfg.ip);
    updateTargetAndDisplay();
    updateCountdown();
  }

  function getCurrentIP() { return (currentConfig && isTruthyString(currentConfig.ip)) ? currentConfig.ip : (serverIpHeroEl?.textContent || defaultConfig.ip); }

  // Bind copy
  if (copyIpBtn) {
    copyIpBtn.addEventListener('click', async () => {
      const text = copyIpBtn.getAttribute('data-copy') || getCurrentIP();
      const ok = await copyText(text);
      const prev = copyIpBtn.textContent;
      if (ok) { const label = copyIpBtn.getAttribute('data-copied-label') || 'Copied!'; copyIpBtn.textContent = label; copyIpBtn.disabled = true; setTimeout(() => { copyIpBtn.textContent = prev; copyIpBtn.disabled = false; }, 1400); }
    });
  }
  document.querySelectorAll('.copy-inline').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy') || getCurrentIP();
      const ok = await copyText(text);
      if (ok) { const prev = btn.textContent; btn.textContent = 'Copied!'; btn.disabled = true; setTimeout(() => { btn.textContent = prev; btn.disabled = false; }, 1400); }
    });
  });

  // Tilt effect
  function bindTilt(card) {
    const dampen = 30;
    let frame = null;
    function onMove(e) {
      const bounds = card.getBoundingClientRect();
      const px = (e.clientX - bounds.left) / bounds.width;
      const py = (e.clientY - bounds.top) / bounds.height;
      const rx = (0.5 - py) * dampen;
      const ry = (px - 0.5) * dampen;
      if (!frame) { frame = requestAnimationFrame(() => { card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`; frame = null; }); }
    }
    function onLeave() { card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)'; }
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('blur', onLeave);
  }
  if (!prefersReducedMotion) { document.querySelectorAll('[data-tilt]').forEach(el => bindTilt(el)); }

  // Countdown
  function updateCountdown() {
    if (!target || !cdEls.d) return;
    const now = new Date();
    const diffMs = target - now;
    if (diffMs <= 0) {
      cdEls.d.textContent = '00'; cdEls.h.textContent = '00'; cdEls.m.textContent = '00'; cdEls.s.textContent = '00';
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

  // Fetch config and apply; also subscribe to SSE for realtime updates
  (async () => {
    const cfg = await fetchConfig();
    currentConfig = cfg; saveLocal(cfg); applyConfig(cfg);
    try {
      const ev = new EventSource('/api/stream');
      ev.addEventListener('config', (e) => {
        try { const cfg = JSON.parse(e.data); currentConfig = cfg; saveLocal(cfg); applyConfig(cfg); } catch(_) {}
      });
    } catch (_) { /* ignore SSE failure */ }

    // Register Service Worker
    try {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js');
      }
    } catch (_) { /* ignore SW failure */ }
  })();

  const canvas = document.getElementById('particles-canvas');
  if (canvas && !prefersReducedMotion) {
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, dpr = Math.max(1, window.devicePixelRatio || 1);
    let particles = [];

    // Ensure canvas never captures pointer events so underlying buttons remain clickable
    canvas.style.pointerEvents = 'none';

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      // Fit canvas to visible size
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1,0,0,1,0,0);
      ctx.scale(dpr, dpr);
      generateParticles();
    }

    function generateParticles() {
      const count = Math.max(20, Math.floor((width * height) / 18000));
      particles = Array.from({ length: count }).map(() => spawn());
    }

    function rand(min, max) { return Math.random() * (max - min) + min; }
    function spawn() { return { x: rand(0, width), y: rand(height * 0.2, height), r: rand(0.7, 2.2), vy: rand(-0.25, -0.8), vx: rand(-0.15, 0.15), a: rand(0.25, 0.9), hue: rand(42, 52) }; }

    let anim = null;
    function draw() {
      ctx.clearRect(0, 0, width, height);
      for (let p of particles) {
        p.x += p.vx; p.y += p.vy; p.a *= 0.9995;
        if (p.y < -10 || p.a < 0.02) Object.assign(p, spawn(), { y: height + 10 });
        if (p.x < -10) p.x = width + 10; else if (p.x > width + 10) p.x = -10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 85%, 62%, ${p.a})`;
        ctx.shadowBlur = 12; ctx.shadowColor = `hsla(${p.hue}, 85%, 52%, ${p.a * 0.85})`;
        ctx.fill();
      }
      anim = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', () => { if (anim) cancelAnimationFrame(anim); resize(); draw(); });
  }

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();