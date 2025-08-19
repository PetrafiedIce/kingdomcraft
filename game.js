(function() {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const holeIndexEl = document.getElementById('hole-index');
  const holeParEl = document.getElementById('hole-par');
  const strokesEl = document.getElementById('strokes');
  const bestEl = document.getElementById('best');
  const resetBtn = document.getElementById('reset-btn');
  const nextBtn = document.getElementById('next-btn');
  const dailyBtn = document.getElementById('daily-btn');
  const endlessBtn = document.getElementById('endless-btn');
  const modeDisplay = document.getElementById('mode-display');
  const dailyIdEl = document.getElementById('daily-id');
  const starsEl = document.getElementById('stars');
  const upgradesSummaryEl = document.getElementById('upgrades-summary');
  const upgradeModal = document.getElementById('upgrade-modal');
  const upgradeOptionsEl = document.getElementById('upgrade-options');
  const skipUpgradeBtn = document.getElementById('skip-upgrade');

  const DPR = Math.max(1, window.devicePixelRatio || 1);
  let viewW = canvas.width;
  let viewH = canvas.height;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    viewW = Math.max(640, Math.floor(rect.width));
    viewH = Math.floor(viewW * 9/16);
    canvas.style.height = viewH + 'px';
    canvas.width = Math.floor(viewW * DPR);
    canvas.height = Math.floor(viewH * DPR);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(DPR, DPR);
    draw();
  }

  // Game modes and procedural hole generator
  const MODES = { DAILY: 'Daily', ENDLESS: 'Endless' };
  let currentMode = MODES.DAILY;
  let prng = mulberry32(getDailySeed());
  let holes = generateCourse(prng);
  updateModeUI();

  function getDailySeed() {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const id = `${yyyy}-${mm}-${dd}`; // ISO UTC date
    dailyIdEl.textContent = id;
    return hashStringToInt(id);
  }

  function updateModeUI() {
    modeDisplay.textContent = currentMode;
    document.getElementById('daily-row').style.display = currentMode === MODES.DAILY ? 'flex' : 'none';
  }

  function setMode(mode) {
    currentMode = mode;
    if (mode === MODES.DAILY) {
      prng = mulberry32(getDailySeed());
    } else {
      const seed = Math.floor(Math.random() * 2**31);
      dailyIdEl.textContent = '—';
      prng = mulberry32(seed);
    }
    holes = generateCourse(prng);
    bestByHole = loadBestForMode();
    // reload stars and upgrades for this mode/day
    stars = loadStars();
    upgrades = loadUpgrades();
    updateStarsUI();
    updateUpgradesSummary();
    updateModeUI();
    loadHole(0);
  }

  let holeIndex = 0;
  let strokes = 0;
  let bestByHole = loadBestForMode();

  const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 8, rolling: false };
  const physics = { friction: 0.985, stop: 0.08, bounce: 0.85, maxPower: 16 };

  // Progression
  const UPGRADE_TYPES = [
    { key: 'power', name: 'Power', desc: 'Increase swing power for longer shots.', max: 5, cost: level => 2 + level },
    { key: 'guide', name: 'Guide', desc: 'Longer trajectory preview while aiming.', max: 5, cost: level => 2 + level },
    { key: 'friction', name: 'Roll', desc: 'Ball keeps rolling longer (lower friction).', max: 5, cost: level => 2 + level },
    { key: 'bounce', name: 'Bounce', desc: 'Balls retain more speed after wall bounces.', max: 5, cost: level => 2 + level },
    { key: 'magnet', name: 'Magnet Cup', desc: 'Slightly larger capture radius on the cup.', max: 5, cost: level => 3 + level },
  ];
  let stars = loadStars();
  let upgrades = loadUpgrades();
  updateStarsUI();
  updateUpgradesSummary();

  function loadHole(i) {
    const hole = holes[i];
    holeIndex = i;
    strokes = 0;
    ball.x = hole.tee.x; ball.y = hole.tee.y; ball.vx = 0; ball.vy = 0; ball.rolling = false;
    holeIndexEl.textContent = String(i + 1);
    holeParEl.textContent = String(hole.par);
    strokesEl.textContent = '0';
    bestEl.textContent = bestByHole[i] != null ? String(bestByHole[i]) : '—';
    draw();
  }

  function storageKeyForMode() {
    if (currentMode === MODES.DAILY) {
      const seed = getDailySeed();
      return `golf:best:daily:${seed}`;
    }
    return 'golf:best:endless';
  }

  function loadBestForMode() {
    try { return JSON.parse(localStorage.getItem(storageKeyForMode()) || '[]'); } catch { return []; }
  }

  function saveBest() {
    if (bestByHole[holeIndex] == null || strokes < bestByHole[holeIndex]) {
      bestByHole[holeIndex] = strokes;
      localStorage.setItem(storageKeyForMode(), JSON.stringify(bestByHole));
      bestEl.textContent = String(strokes);
    }
  }

  function storageBaseForMode() {
    if (currentMode === MODES.DAILY) return `golf:${getDailySeed()}`;
    return 'golf:endless';
  }

  function loadStars() {
    try { return Number(localStorage.getItem(`${storageBaseForMode()}:stars`) || '0'); } catch { return 0; }
  }

  function saveStars() {
    localStorage.setItem(`${storageBaseForMode()}:stars`, String(stars));
  }

  function updateStarsUI() {
    starsEl.textContent = String(stars);
  }

  function loadUpgrades() {
    try { return JSON.parse(localStorage.getItem(`${storageBaseForMode()}:upgrades`) || '{}'); } catch { return {}; }
  }

  function saveUpgrades() {
    localStorage.setItem(`${storageBaseForMode()}:upgrades`, JSON.stringify(upgrades));
  }

  function getUpgradeLevel(key) {
    return Math.max(0, Math.min(5, (upgrades[key] || 0)));
  }

  function setUpgradeLevel(key, level) {
    upgrades[key] = Math.max(0, Math.min(5, level));
    saveUpgrades();
    updateUpgradesSummary();
  }

  function updateUpgradesSummary() {
    const parts = UPGRADE_TYPES
      .map(u => ({ n: u.name, l: getUpgradeLevel(u.key) }))
      .filter(x => x.l > 0)
      .map(x => `${x.n} +${x.l}`);
    upgradesSummaryEl.textContent = parts.length ? parts.join(', ') : 'None';
  }

  // Input handling
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let aimPosCache = null;

  canvas.addEventListener('mousedown', (e) => {
    const { x, y } = toLocal(e);
    if (!ball.rolling) {
      isDragging = true;
      dragStart = { x, y };
    }
  });
  window.addEventListener('mousemove', (e) => { if (isDragging) { aimPosCache = toLocal(e); draw(aimPosCache); } });
  window.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    const { x, y } = toLocal(e);
    const dx = dragStart.x - x;
    const dy = dragStart.y - y;
    const mag = Math.hypot(dx, dy);
    const n = Math.min(getMaxPower(), mag / 12);
    const angle = Math.atan2(dy, dx);
    ball.vx = n * Math.cos(angle);
    ball.vy = n * Math.sin(angle);
    ball.rolling = true; isDragging = false; strokes += 1; strokesEl.textContent = String(strokes);
    aimPosCache = null;
  });

  function toLocal(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (viewW / rect.width), y: (e.clientY - rect.top) * (viewH / rect.height) };
  }

  // Physics & collisions
  function step(dt) {
    if (!ball.rolling) return;
    ball.x += ball.vx;
    ball.y += ball.vy;
    const fr = Math.min(0.998, physics.friction + getUpgradeLevel('friction') * 0.002);
    ball.vx *= fr;
    ball.vy *= fr;

    // Walls (level geometry)
    const walls = holes[holeIndex].walls;
    for (let w of walls) {
      const hit = circleRectCollision(ball.x, ball.y, ball.r, w);
      if (hit) {
        // reflect velocity
        const prevX = ball.x - ball.vx;
        const prevY = ball.y - ball.vy;
        if (prevX + ball.r <= w.x || prevX - ball.r >= w.x + w.w) {
          ball.vx = -ball.vx * getBounce();
          if (ball.x < w.x) ball.x = w.x - ball.r; else if (ball.x > w.x + w.w) ball.x = w.x + w.w + ball.r;
        }
        if (prevY + ball.r <= w.y || prevY - ball.r >= w.y + w.h) {
          ball.vy = -ball.vy * getBounce();
          if (ball.y < w.y) ball.y = w.y - ball.r; else if (ball.y > w.y + w.h) ball.y = w.y + w.h + ball.r;
        }
      }
    }

    // Borders
    if (ball.x - ball.r < 80) { ball.x = 80 + ball.r; ball.vx = -ball.vx * getBounce(); }
    if (ball.x + ball.r > 880) { ball.x = 880 - ball.r; ball.vx = -ball.vx * getBounce(); }
    if (ball.y - ball.r < 80) { ball.y = 80 + ball.r; ball.vy = -ball.vy * getBounce(); }
    if (ball.y + ball.r > 460) { ball.y = 460 - ball.r; ball.vy = -ball.vy * getBounce(); }

    // Cup (hole)
    const cup = holes[holeIndex].cup;
    const dist = Math.hypot(ball.x - cup.x, ball.y - cup.y);
    if (dist < getCaptureRadius()) {
      // sink the ball
      ball.rolling = false; ball.vx = 0; ball.vy = 0; ball.x = cup.x; ball.y = cup.y;
      saveBest();
      const gained = awardStarsOnFinish();
      if (gained > 0) { updateStarsUI(); }
      maybeOfferUpgrade();
    }

    if (Math.hypot(ball.vx, ball.vy) < physics.stop) {
      ball.vx = 0; ball.vy = 0; ball.rolling = false;
    }
  }

  function circleRectCollision(cx, cy, cr, rect) {
    const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return (dx*dx + dy*dy) <= cr*cr;
  }

  // Rendering
  let nowMs = 0;
  function draw(aimPos) {
    ctx.clearRect(0, 0, viewW, viewH);

    // Course background
    drawCourse();

    // Hole cup
    const cup = holes[holeIndex].cup;
    ctx.beginPath();
    ctx.arc(cup.x, cup.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0f22';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cup.x, cup.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#1dd68c';
    ctx.fill();

    // Walls
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let w of holes[holeIndex].walls) ctx.fillRect(w.x, w.y, w.w, w.h);

    // Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.r);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#cfd8ea');
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke();

    // Aim visuals and power/trajectory
    if (isDragging && aimPos) {
      const dx = dragStart.x - aimPos.x;
      const dy = dragStart.y - aimPos.y;
      const mag = Math.hypot(dx, dy);
      const maxP = getMaxPower();
      const n = Math.min(maxP, mag / 12);
      const angle = Math.atan2(dy, dx);
      const pvx = n * Math.cos(angle);
      const pvy = n * Math.sin(angle);

      // Trajectory preview
      const pts = simulateTrajectory(ball.x, ball.y, pvx, pvy, 120 + getUpgradeLevel('guide') * 40);
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -nowMs / 20;
      ctx.strokeStyle = 'rgba(56,217,150,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (pts.length) {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Direction arrow
      const ax = ball.x - Math.cos(angle) * (12 + n * 1.2);
      const ay = ball.y - Math.sin(angle) * (12 + n * 1.2);
      drawArrow(ax, ay, angle + Math.PI, Math.min(16 + n * 1.4, 42));

      // Power ring
      const pct = n / maxP;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 8, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * pct);
      ctx.strokeStyle = 'rgba(56,217,150,0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // HUD power bar
      ctx.fillStyle = 'rgba(56,217,150,0.25)';
      ctx.fillRect(24, 24, pct * (maxP * 24 / physics.maxPower), 8);
      ctx.strokeStyle = 'rgba(56,217,150,0.6)';
      ctx.strokeRect(24, 24, (maxP * 24 / physics.maxPower), 8);
    } else if (!ball.rolling) {
      // Idle pulse around ball
      const pulse = 6 + Math.sin(nowMs / 400) * 2;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56,217,150,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawCourse() {
    // Outer border
    ctx.fillStyle = '#0c1537';
    ctx.fillRect(60, 60, viewW - 120, viewH - 120);
    // Inset grass
    const grd = ctx.createLinearGradient(0, 60, 0, viewH - 60);
    grd.addColorStop(0, '#0d3c2c');
    grd.addColorStop(1, '#0b3326');
    ctx.fillStyle = grd;
    ctx.fillRect(80, 80, viewW - 160, viewH - 160);
  }

  // Procedural course generation
  function generateCourse(rand) {
    const numHoles = 9;
    const course = [];
    for (let i = 0; i < numHoles; i++) {
      const par = 2 + (i % 3);
      const tee = { x: 120 + Math.floor(rand() * 140), y: 360 + Math.floor(rand() * 80) };
      const cup = { x: 720 + Math.floor(rand() * 120), y: 120 + Math.floor(rand() * 120) };
      const walls = createRandomWalls(rand, tee, cup);
      course.push({ par, tee, cup, walls });
    }
    return course;
  }

  function createRandomWalls(rand, tee, cup) {
    const walls = [];
    const obstacles = 3 + Math.floor(rand() * 4);
    let attempts = 0;
    for (let i = 0; i < obstacles && attempts < 100; ) {
      attempts++;
      const vertical = rand() > 0.5;
      let rect;
      if (vertical) {
        const x = 160 + Math.floor(rand() * 640);
        const y = 140 + Math.floor(rand() * 260);
        const h = 60 + Math.floor(rand() * 240);
        rect = { x, y, w: 16, h };
      } else {
        const x = 140 + Math.floor(rand() * 660);
        const y = 160 + Math.floor(rand() * 240);
        const w = 80 + Math.floor(rand() * 300);
        rect = { x, y, w, h: 16 };
      }
      const safeRadius = 42;
      if (rectIntersectsCircle(rect, tee.x, tee.y, safeRadius) || rectIntersectsCircle(rect, cup.x, cup.y, safeRadius)) {
        continue;
      }
      let overlaps = false;
      for (let existing of walls) {
        if (rectsOverlap(rect, existing, 6)) { overlaps = true; break; }
      }
      if (overlaps) continue;
      walls.push(rect);
      i++;
    }
    return walls;
  }

  function rectIntersectsCircle(rect, cx, cy, cr) {
    const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return (dx*dx + dy*dy) <= cr*cr;
  }

  function rectsOverlap(a, b, margin) {
    return !(a.x + a.w + margin <= b.x ||
             b.x + b.w + margin <= a.x ||
             a.y + a.h + margin <= b.y ||
             b.y + b.h + margin <= a.y);
  }

  // Simple deterministic PRNG and hash
  function mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  function hashStringToInt(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Helpers derived from upgrades
  function getMaxPower() {
    return physics.maxPower + getUpgradeLevel('power') * 2;
  }

  function getBounce() {
    return Math.min(0.98, physics.bounce + getUpgradeLevel('bounce') * 0.03);
  }

  function getCaptureRadius() {
    return 14 + getUpgradeLevel('magnet') * 1.2;
  }

  function simulateTrajectory(x, y, vx, vy, steps) {
    const pts = [];
    const cup = holes[holeIndex].cup;
    const walls = holes[holeIndex].walls;
    const fr = Math.min(0.998, physics.friction + getUpgradeLevel('friction') * 0.002);
    for (let i = 0; i < steps; i++) {
      x += vx; y += vy;
      vx *= fr; vy *= fr;
      // walls
      for (let w of walls) {
        const hit = circleRectCollision(x, y, ball.r, w);
        if (hit) {
          const prevX = x - vx; const prevY = y - vy;
          if (prevX + ball.r <= w.x || prevX - ball.r >= w.x + w.w) vx = -vx * getBounce();
          if (prevY + ball.r <= w.y || prevY - ball.r >= w.y + w.h) vy = -vy * getBounce();
        }
      }
      // borders
      if (x - ball.r < 80) { x = 80 + ball.r; vx = -vx * getBounce(); }
      if (x + ball.r > 880) { x = 880 - ball.r; vx = -vx * getBounce(); }
      if (y - ball.r < 80) { y = 80 + ball.r; vy = -vy * getBounce(); }
      if (y + ball.r > 460) { y = 460 - ball.r; vy = -vy * getBounce(); }
      pts.push({ x, y });
      if (Math.hypot(vx, vy) < physics.stop) break;
      const dist = Math.hypot(x - cup.x, y - cup.y);
      if (dist < getCaptureRadius()) break;
    }
    return pts;
  }

  function drawArrow(x, y, angle, len) {
    const endX = x + Math.cos(angle) * len;
    const endY = y + Math.sin(angle) * len;
    ctx.strokeStyle = 'rgba(56,217,150,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(endX, endY); ctx.stroke();
    // head
    const headLen = 8;
    const left = angle + Math.PI * 0.8;
    const right = angle - Math.PI * 0.8;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX + Math.cos(left) * headLen, endY + Math.sin(left) * headLen);
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX + Math.cos(right) * headLen, endY + Math.sin(right) * headLen);
    ctx.stroke();
  }

  function awardStarsOnFinish() {
    const par = holes[holeIndex].par;
    let gained = 1; // base
    if (strokes <= par) gained += 1;
    if (strokes === 1) gained += 2;
    stars += gained;
    saveStars();
    return gained;
  }

  function maybeOfferUpgrade() {
    // Offer after each hole
    openUpgradeModal();
  }

  function openUpgradeModal() {
    // Pick three random upgrades
    const choices = [];
    const pool = [...UPGRADE_TYPES];
    while (choices.length < 3 && pool.length) {
      const idx = Math.floor((Math.random()) * pool.length);
      const u = pool.splice(idx, 1)[0];
      choices.push(u);
    }
    upgradeOptionsEl.innerHTML = '';
    for (let u of choices) {
      const level = getUpgradeLevel(u.key);
      const maxed = level >= u.max;
      const cost = u.cost(level);
      const canAfford = stars >= cost && !maxed;
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      const title = document.createElement('h3'); title.textContent = `${u.name} ${maxed ? '(Max)' : `Lv ${level} → ${level+1}`}`;
      const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = maxed ? 'MAX' : `${cost}★`;
      const p = document.createElement('p'); p.textContent = u.desc;
      const actions = document.createElement('div'); actions.className = 'actions';
      const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = maxed ? 'Maxed' : 'Upgrade';
      if (!canAfford) btn.classList.add('btn-ghost');
      btn.disabled = !canAfford;
      btn.addEventListener('click', () => {
        stars -= cost; saveStars(); updateStarsUI();
        setUpgradeLevel(u.key, level + 1);
        closeUpgradeModal();
      });
      const header = document.createElement('div'); header.style.display = 'flex'; header.style.justifyContent = 'space-between'; header.appendChild(title); header.appendChild(badge);
      actions.appendChild(btn);
      card.appendChild(header); card.appendChild(p); card.appendChild(actions);
      upgradeOptionsEl.appendChild(card);
    }
    upgradeModal.setAttribute('aria-hidden', 'false');
  }

  function closeUpgradeModal() { upgradeModal.setAttribute('aria-hidden', 'true'); }
  skipUpgradeBtn.addEventListener('click', () => closeUpgradeModal());

  // Game loop
  let last = 0;
  function loop(ts) {
    if (!last) last = ts; const dt = Math.min(32, ts - last); last = ts;
    nowMs = ts;
    step(dt);
    draw(aimPosCache);
    requestAnimationFrame(loop);
  }

  // Controls
  resetBtn.addEventListener('click', () => loadHole(holeIndex));
  nextBtn.addEventListener('click', () => loadHole((holeIndex + 1) % holes.length));
  dailyBtn.addEventListener('click', () => setMode(MODES.DAILY));
  endlessBtn.addEventListener('click', () => setMode(MODES.ENDLESS));

  window.addEventListener('resize', resize);

  // Init
  resize();
  loadHole(0);
  requestAnimationFrame(loop);
})();

