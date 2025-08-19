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
  const hudPanel = document.getElementById('hud-panel');
  const collapseBtn = document.getElementById('collapse-btn');

  const DPR = Math.max(1, window.devicePixelRatio || 1);
  let viewW = canvas.width;
  let viewH = canvas.height;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    viewW = Math.floor(rect.width);
    viewH = Math.floor(rect.height);
    canvas.width = Math.floor(viewW * DPR);
    canvas.height = Math.floor(viewH * DPR);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(DPR, DPR);
    // Regenerate course to fit new size while keeping seed
    holes = generateCourse(currentSeed);
    loadHole(Math.min(holeIndex, holes.length - 1));
    constrainHudPanel();
    draw();
  }

  // Game modes and procedural hole generator
  const MODES = { DAILY: 'Daily', ENDLESS: 'Endless' };
  let currentMode = MODES.DAILY;
  let currentSeed = getDailySeed();
  let holes = generateCourse(currentSeed);
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
      currentSeed = getDailySeed();
    } else {
      const seed = Math.floor(Math.random() * 2**31);
      dailyIdEl.textContent = '—';
      currentSeed = seed;
    }
    holes = generateCourse(currentSeed);
    bestByHole = loadBestForMode();
    updateModeUI();
    loadHole(0);
  }

  let holeIndex = 0;
  let strokes = 0;
  let bestByHole = loadBestForMode();

  const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 8, rolling: false };
  const physics = { friction: 0.985, stop: 0.08, bounce: 0.85, maxPower: 16 };

  // No upgrades; keep base physics

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

  // --- HUD Dragging & Collapse ---
  const dragHandle = hudPanel.querySelector('.drag-handle');
  let isHudDragging = false;
  let hudDragOffset = { x: 0, y: 0 };
  dragHandle.addEventListener('mousedown', (e) => {
    isHudDragging = true;
    const rect = hudPanel.getBoundingClientRect();
    hudDragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    // ensure left-based positioning for drag
    hudPanel.style.right = '';
    hudPanel.style.left = rect.left + 'px';
  });
  window.addEventListener('mousemove', (e) => {
    if (!isHudDragging) return;
    const x = Math.max(8, Math.min(window.innerWidth - hudPanel.offsetWidth - 8, e.clientX - hudDragOffset.x));
    const y = Math.max(8, Math.min(window.innerHeight - hudPanel.offsetHeight - 8, e.clientY - hudDragOffset.y));
    hudPanel.style.left = x + 'px';
    hudPanel.style.top = y + 'px';
  });
  window.addEventListener('mouseup', () => { isHudDragging = false; });

  collapseBtn.addEventListener('click', () => {
    const collapsed = hudPanel.getAttribute('data-collapsed') === 'true';
    if (collapsed) {
      hudPanel.setAttribute('data-collapsed', 'false');
    } else {
      // Snap to nearest side
      const rect = hudPanel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dockRight = centerX > window.innerWidth / 2;
      hudPanel.dataset.dock = dockRight ? 'right' : 'left';
      if (dockRight) {
        hudPanel.style.right = '16px';
        hudPanel.style.left = '';
      } else {
        hudPanel.style.left = '16px';
        hudPanel.style.right = '';
      }
      hudPanel.setAttribute('data-collapsed', 'true');
    }
  });

  function constrainHudPanel() {
    const rect = hudPanel.getBoundingClientRect();
    let x = rect.left, y = rect.top;
    x = Math.max(8, Math.min(window.innerWidth - rect.width - 8, x));
    y = Math.max(8, Math.min(window.innerHeight - rect.height - 8, y));
    hudPanel.style.left = x + 'px';
    hudPanel.style.top = y + 'px';
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
    ball.vx *= physics.friction;
    ball.vy *= physics.friction;

    // Walls (level geometry)
    const walls = holes[holeIndex].walls;
    for (let w of walls) {
      const hit = circleRectCollision(ball.x, ball.y, ball.r, w);
      if (hit) {
        // reflect velocity
        const prevX = ball.x - ball.vx;
        const prevY = ball.y - ball.vy;
        if (prevX + ball.r <= w.x || prevX - ball.r >= w.x + w.w) {
          ball.vx = -ball.vx * physics.bounce;
          if (ball.x < w.x) ball.x = w.x - ball.r; else if (ball.x > w.x + w.w) ball.x = w.x + w.w + ball.r;
        }
        if (prevY + ball.r <= w.y || prevY - ball.r >= w.y + w.h) {
          ball.vy = -ball.vy * physics.bounce;
          if (ball.y < w.y) ball.y = w.y - ball.r; else if (ball.y > w.y + w.h) ball.y = w.y + w.h + ball.r;
        }
      }
    }

    // Bumpers (circular)
    const bumpers = holes[holeIndex].bumpers || [];
    for (let b of bumpers) {
      const dx = ball.x - b.x; const dy = ball.y - b.y; const dist = Math.hypot(dx, dy);
      const minDist = ball.r + b.r;
      if (dist < minDist) {
        // push out
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        ball.x = b.x + nx * minDist;
        ball.y = b.y + ny * minDist;
        // reflect velocity along normal with bounce
        const vDotN = ball.vx * nx + ball.vy * ny;
        ball.vx = (ball.vx - 2 * vDotN * nx) * (physics.bounce * 1.25);
        ball.vy = (ball.vy - 2 * vDotN * ny) * (physics.bounce * 1.25);
        // record hit for animation
        b.hitAt = nowMs || performance.now();
      }
    }

    // Angled wall collisions (segment thickness t)
    const angled = holes[holeIndex].angled || [];
    for (let s of angled) {
      const c = closestPointOnSegment(s.x1, s.y1, s.x2, s.y2, ball.x, ball.y);
      const dx = ball.x - c.x, dy = ball.y - c.y; const d = Math.hypot(dx, dy);
      const minD = ball.r + s.t * 0.5;
      if (d < minD) {
        const nx = dx / (d || 1), ny = dy / (d || 1);
        ball.x = c.x + nx * minD; ball.y = c.y + ny * minD;
        const vDotN = ball.vx * nx + ball.vy * ny;
        ball.vx = ball.vx - 2 * vDotN * nx;
        ball.vy = ball.vy - 2 * vDotN * ny;
        ball.vx *= physics.bounce; ball.vy *= physics.bounce;
      }
    }

    // Borders
    const left = 0, right = viewW, top = 0, bottom = viewH;
    if (ball.x - ball.r < left) { ball.x = left + ball.r; ball.vx = -ball.vx * physics.bounce; }
    if (ball.x + ball.r > right) { ball.x = right - ball.r; ball.vx = -ball.vx * physics.bounce; }
    if (ball.y - ball.r < top) { ball.y = top + ball.r; ball.vy = -ball.vy * physics.bounce; }
    if (ball.y + ball.r > bottom) { ball.y = bottom - ball.r; ball.vy = -ball.vy * physics.bounce; }

    // Cup (hole)
    const cup = holes[holeIndex].cup;
    const dist = Math.hypot(ball.x - cup.x, ball.y - cup.y);
    if (dist < 14) {
      // sink the ball
      ball.rolling = false; ball.vx = 0; ball.vy = 0; ball.x = cup.x; ball.y = cup.y;
      saveBest();
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

  function roundRect(ctx, x, y, w, h, rx, ry) {
    rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rx, y);
    ctx.lineTo(x + w - rx, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + ry);
    ctx.lineTo(x + w, y + h - ry);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h);
    ctx.lineTo(x + rx, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - ry);
    ctx.lineTo(x, y + ry);
    ctx.quadraticCurveTo(x, y, x + rx, y);
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
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let w of holes[holeIndex].walls) {
      // rounded beveled walls
      const rx = 8, ry = 8;
      roundRect(ctx, w.x, w.y, w.w, w.h, rx, ry);
      const wallGrad = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
      wallGrad.addColorStop(0, 'rgba(230,255,245,0.28)');
      wallGrad.addColorStop(1, 'rgba(200,240,228,0.18)');
      ctx.fillStyle = wallGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.stroke();
    }

    // Bumpers
    if (holes[holeIndex].bumpers) {
      const t = (nowMs || 0) / 1000;
      for (let b of holes[holeIndex].bumpers) {
        const pulse = 0.06 + 0.04 * Math.sin(t * 2 + (b.x + b.y) * 0.01);
        // glossy bumper
        const g = ctx.createRadialGradient(b.x - b.r * (0.4 + pulse), b.y - b.r * (0.4 + pulse), 1, b.x, b.y, b.r * (1 + pulse));
        g.addColorStop(0, '#7af7cf');
        g.addColorStop(0.6, '#2fd89b');
        g.addColorStop(1, '#12805b');
        ctx.fillStyle = g;
        ctx.beginPath();
        let scale = 1;
        if (b.hitAt) {
          const elapsed = ((nowMs || 0) - b.hitAt) / 1000;
          if (elapsed < 0.25) {
            scale = 1 + 0.25 * (1 - elapsed / 0.25);
          } else {
            b.hitAt = 0;
          }
        }
        ctx.arc(b.x, b.y, b.r * scale, 0, Math.PI * 2);
        ctx.fill();
        // specular highlight
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.35 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke();
      }
    }

    // Angled walls render
    if (holes[holeIndex].angled) {
      for (let s of holes[holeIndex].angled) {
        const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        ctx.save();
        ctx.translate(s.x1, s.y1);
        ctx.rotate(ang);
        const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        roundRect(ctx, 0, -s.t * 0.5, len, s.t, 6, 6);
        const lg = ctx.createLinearGradient(0, -s.t * 0.5, 0, s.t * 0.5);
        lg.addColorStop(0, 'rgba(230,255,245,0.3)');
        lg.addColorStop(1, 'rgba(180,230,215,0.2)');
        ctx.fillStyle = lg; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
        ctx.restore();
      }
    }

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
      const maxP = physics.maxPower;
      const n = Math.min(maxP, mag / 12);
      const angle = Math.atan2(dy, dx);
      const pvx = n * Math.cos(angle);
      const pvy = n * Math.sin(angle);

      // Trajectory preview
      const pts = simulateTrajectory(ball.x, ball.y, pvx, pvy, 220);
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -nowMs / 20;
      ctx.strokeStyle = 'rgba(50,230,161,0.9)';
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
      ctx.strokeStyle = 'rgba(50,230,161,0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // HUD power bar
      ctx.fillStyle = 'rgba(50,230,161,0.25)';
      ctx.fillRect(24, 24, pct * (maxP * 24 / physics.maxPower), 8);
      ctx.strokeStyle = 'rgba(50,230,161,0.6)';
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
    // Fullscreen background
    const bg = ctx.createLinearGradient(0, 0, 0, viewH);
    bg.addColorStop(0, '#0d3c2c');
    bg.addColorStop(1, '#0b3326');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, viewW, viewH);

    // Fairway path (visual only)
    const hole = holes[holeIndex];
    if (hole && hole.fairway) {
      const { cpx, cpy, width } = hole.fairway;
      const tee = hole.tee; const cup = hole.cup;
      // Edge border
      ctx.strokeStyle = 'rgba(7,20,44,0.85)';
      ctx.lineWidth = width + 16;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(tee.x, tee.y);
      ctx.quadraticCurveTo(cpx, cpy, cup.x, cup.y);
      ctx.stroke();
      // Fairway fill
      const fw = ctx.createLinearGradient(0, Math.min(tee.y, cup.y), 0, Math.max(tee.y, cup.y));
      fw.addColorStop(0, '#0f4b36');
      fw.addColorStop(1, '#0c3e2c');
      ctx.strokeStyle = fw;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(tee.x, tee.y);
      ctx.quadraticCurveTo(cpx, cpy, cup.x, cup.y);
      ctx.stroke();
      // Subtle mowing stripes
      const stripes = 6;
      for (let i = 0; i < stripes; i++) {
        const t = (i + 0.5) / stripes;
        const w = width * (0.7 + 0.2 * Math.sin(i * 2));
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = w * 0.12;
        ctx.beginPath();
        const mx = (1 - t) * (1 - t) * tee.x + 2 * (1 - t) * t * cpx + t * t * cup.x;
        const my = (1 - t) * (1 - t) * tee.y + 2 * (1 - t) * t * cpy + t * t * cup.y;
        ctx.arc(mx, my, w * 0.35, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // Procedural course generation
  function generateCourse(seed) {
    const rand = mulberry32(seed);
    const numHoles = 9;
    const course = [];
    const left = 0, right = viewW, top = 0, bottom = viewH;
    const width = right - left, height = bottom - top;
    for (let i = 0; i < numHoles; i++) {
      const par = 2 + (i % 3);
      const tee = {
        x: left + 60 + Math.floor(rand() * Math.max(40, width * 0.25)),
        y: top + Math.floor(height * 0.65 + rand() * Math.max(40, height * 0.3))
      };
      const cup = {
        x: right - 60 - Math.floor(rand() * Math.max(40, width * 0.25)),
        y: top + 60 + Math.floor(rand() * Math.max(40, height * 0.35))
      };
      // Fairway control
      const rand2 = mulberry32((seed ^ (i + 1) * 0x9E3779B1) >>> 0);
      const dx = cup.x - tee.x; const dy = cup.y - tee.y; const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len; const ny = dx / len;
      const sign = rand2() > 0.5 ? 1 : -1;
      const off = Math.min(200, Math.max(80, len * (0.18 + rand2() * 0.08))) * sign;
      const cpx = (tee.x + cup.x) / 2 + nx * off;
      const cpy = (tee.y + cup.y) / 2 + ny * off;
      const fairway = { cpx, cpy, width: Math.max(100, Math.min(220, 140 + rand2() * 60)) };
      const { walls, bumpers, angled } = createObstacles(rand, tee, cup, left, right, top, bottom);
      course.push({ par, tee, cup, walls, bumpers, angled, fairway });
    }
    return course;
  }

  function createObstacles(rand, tee, cup, left, right, top, bottom) {
    const walls = [];
    const bumpers = [];
    const angled = [];
    const obstacles = 3 + Math.floor(rand() * 4);
    let attempts = 0;
    for (let i = 0; i < obstacles && attempts < 200; ) {
      attempts++;
      const vertical = rand() > 0.5;
      let rect;
      if (vertical) {
        const x = left + 60 + Math.floor(rand() * Math.max(40, (right - left - 120)));
        const y = top + 40 + Math.floor(rand() * Math.max(40, (bottom - top - 120)));
        const h = 80 + Math.floor(rand() * Math.max(40, (bottom - y - 140)));
        rect = { x, y, w: 16, h: Math.min(h, bottom - y - 40) };
      } else {
        const x = left + 40 + Math.floor(rand() * Math.max(40, (right - left - 120)));
        const y = top + 60 + Math.floor(rand() * Math.max(40, (bottom - top - 140)));
        const w = 120 + Math.floor(rand() * Math.max(40, (right - x - 160)));
        rect = { x, y, w: Math.min(w, right - x - 40), h: 16 };
      }
      const safeRadius = 42;
      if (rectIntersectsCircle(rect, tee.x, tee.y, safeRadius) || rectIntersectsCircle(rect, cup.x, cup.y, safeRadius)) {
        continue;
      }
      // Keep corridor clear between tee and cup
      if (segmentIntersectsRect(tee.x, tee.y, cup.x, cup.y, expandRect(rect, 26))) {
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
    // Add circular bumpers
    const bumperCount = 2 + Math.floor(rand() * 3);
    attempts = 0;
    for (let i = 0; i < bumperCount && attempts < 200; ) {
      attempts++;
      const r = 12 + Math.floor(rand() * 10);
      const x = left + 80 + Math.floor(rand() * Math.max(80, right - left - 160));
      const y = top + 80 + Math.floor(rand() * Math.max(80, bottom - top - 160));
      const b = { x, y, r };
      // Avoid tee/cup and corridor
      if (Math.hypot(x - tee.x, y - tee.y) < r + 60) continue;
      if (Math.hypot(x - cup.x, y - cup.y) < r + 60) continue;
      if (circleIntersectsSegment(b, { x: tee.x, y: tee.y }, { x: cup.x, y: cup.y }, 24)) continue;
      // Avoid walls and other bumpers
      let bad = false;
      for (let w of walls) { if (circleIntersectsRect(x, y, r + 8, w)) { bad = true; break; } }
      if (bad) continue;
      for (let bb of bumpers) { if (Math.hypot(x - bb.x, y - bb.y) < r + bb.r + 16) { bad = true; break; } }
      if (bad) continue;
      bumpers.push(b);
      i++;
    }
    // Add angled walls (segments)
    const angledCount = 2 + Math.floor(rand() * 2);
    attempts = 0;
    for (let i = 0; i < angledCount && attempts < 200; ) {
      attempts++;
      const len = 120 + Math.floor(rand() * 180);
      const angle = rand() * Math.PI * 2;
      const t = 14 + Math.floor(rand() * 6);
      const cx = left + 120 + Math.floor(rand() * Math.max(120, right - left - 240));
      const cy = top + 120 + Math.floor(rand() * Math.max(120, bottom - top - 240));
      const x1 = cx - Math.cos(angle) * len * 0.5;
      const y1 = cy - Math.sin(angle) * len * 0.5;
      const x2 = cx + Math.cos(angle) * len * 0.5;
      const y2 = cy + Math.sin(angle) * len * 0.5;
      const seg = { x1, y1, x2, y2, t };
      // bounds check
      const bb = segmentBoundingBox(seg, t + 8);
      if (bb.x < left + 20 || bb.x + bb.w > right - 20 || bb.y < top + 20 || bb.y + bb.h > bottom - 20) continue;
      // avoid tee/cup proximity
      if (pointToSegmentDistance(tee.x, tee.y, x1, y1, x2, y2) < 60) continue;
      if (pointToSegmentDistance(cup.x, cup.y, x1, y1, x2, y2) < 60) continue;
      // keep main corridor reasonably clear
      if (segmentsIntersect(tee.x, tee.y, cup.x, cup.y, x1, y1, x2, y2)) continue;
      // avoid walls and bumpers
      let bad = false;
      for (let w of walls) { if (rectsOverlap(bb, w, 6)) { bad = true; break; } }
      if (bad) continue;
      for (let b of bumpers) { if (circleIntersectsRect(b.x, b.y, b.r + 8, bb)) { bad = true; break; } }
      if (bad) continue;
      for (let s of angled) { if (rectsOverlap(bb, segmentBoundingBox(s, s.t + 6), 0)) { bad = true; break; } }
      if (bad) continue;
      angled.push(seg);
      i++;
    }
    return { walls, bumpers, angled };
  }

  function rectIntersectsCircle(rect, cx, cy, cr) {
    const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return (dx*dx + dy*dy) <= cr*cr;
  }

  function circleIntersectsRect(cx, cy, cr, rect) {
    return rectIntersectsCircle(rect, cx, cy, cr);
  }

  function circleIntersectsSegment(c, a, b, padding) {
    const pr = c.r + (padding || 0);
    const vx = b.x - a.x, vy = b.y - a.y;
    const wx = c.x - a.x, wy = c.y - a.y;
    const proj = (wx*vx + wy*vy) / (vx*vx + vy*vy);
    const t = Math.max(0, Math.min(1, proj));
    const px = a.x + vx * t, py = a.y + vy * t;
    const dx = c.x - px, dy = c.y - py;
    return (dx*dx + dy*dy) <= pr*pr;
  }

  function rectsOverlap(a, b, margin) {
    return !(a.x + a.w + margin <= b.x ||
             b.x + b.w + margin <= a.x ||
             a.y + a.h + margin <= b.y ||
             b.y + b.h + margin <= a.y);
  }

  function expandRect(r, m) { return { x: r.x - m, y: r.y - m, w: r.w + 2*m, h: r.h + 2*m }; }

  function pointInRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }

  function segmentIntersectsRect(ax, ay, bx, by, r) {
    if (pointInRect(ax, ay, r) || pointInRect(bx, by, r)) return true;
    // Check intersection with each edge
    const edges = [
      [r.x, r.y, r.x + r.w, r.y],
      [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
      [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
      [r.x, r.y + r.h, r.x, r.y]
    ];
    for (let e of edges) { if (segmentsIntersect(ax, ay, bx, by, e[0], e[1], e[2], e[3])) return true; }
    return false;
  }

  function segmentsIntersect(x1,y1,x2,y2,x3,y3,x4,y4) {
    function ccw(ax,ay,bx,by,cx,cy){ return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax); }
    return (ccw(x1,y1,x3,y3,x4,y4) !== ccw(x2,y2,x3,y3,x4,y4)) && (ccw(x1,y1,x2,y2,x3,y3) !== ccw(x1,y1,x2,y2,x4,y4));
  }

  function segmentBoundingBox(seg, pad) {
    const x = Math.min(seg.x1, seg.x2) - pad;
    const y = Math.min(seg.y1, seg.y2) - pad;
    const w = Math.abs(seg.x2 - seg.x1) + pad * 2;
    const h = Math.abs(seg.y2 - seg.y1) + pad * 2;
    return { x, y, w, h };
  }

  function closestPointOnSegment(ax, ay, bx, by, px, py) {
    const vx = bx - ax, vy = by - ay;
    const wx = px - ax, wy = py - ay;
    const denom = vx*vx + vy*vy || 1;
    let t = (wx*vx + wy*vy) / denom;
    t = Math.max(0, Math.min(1, t));
    return { x: ax + vx * t, y: ay + vy * t, t };
  }

  function pointToSegmentDistance(px, py, ax, ay, bx, by) {
    const c = closestPointOnSegment(ax, ay, bx, by, px, py);
    return Math.hypot(px - c.x, py - c.y);
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

  // Helpers (no upgrades)
  function getMaxPower() { return physics.maxPower; }
  function getBounce() { return physics.bounce; }
  function getCaptureRadius() { return 14; }

  function simulateTrajectory(x, y, vx, vy, steps) {
    const pts = [];
    const cup = holes[holeIndex].cup;
    const walls = holes[holeIndex].walls;
    const bumpers = holes[holeIndex].bumpers || [];
    const angled = holes[holeIndex].angled || [];
    const fr = physics.friction;
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
      // bumpers
      for (let b of bumpers) {
        const dx = x - b.x, dy = y - b.y; const d = Math.hypot(dx, dy);
        const minD = ball.r + b.r;
        if (d < minD) {
          const nx = dx / (d || 1), ny = dy / (d || 1);
          x = b.x + nx * minD; y = b.y + ny * minD;
          const vDotN = vx * nx + vy * ny;
          vx = (vx - 2 * vDotN * nx) * (getBounce() * 1.25);
          vy = (vy - 2 * vDotN * ny) * (getBounce() * 1.25);
        }
      }
      // angled segments
      for (let s of angled) {
        const c = closestPointOnSegment(s.x1, s.y1, s.x2, s.y2, x, y);
        const dx = x - c.x, dy = y - c.y; const d = Math.hypot(dx, dy);
        const minD = ball.r + s.t * 0.5;
        if (d < minD) {
          const nx = dx / (d || 1), ny = dy / (d || 1);
          x = c.x + nx * minD; y = c.y + ny * minD;
          const vDotN = vx * nx + vy * ny;
          vx = (vx - 2 * vDotN * nx) * getBounce();
          vy = (vy - 2 * vDotN * ny) * getBounce();
        }
      }
      // borders
      const leftB = 0, rightB = viewW, topB = 0, bottomB = viewH;
      if (x - ball.r < leftB) { x = leftB + ball.r; vx = -vx * physics.bounce; }
      if (x + ball.r > rightB) { x = rightB - ball.r; vx = -vx * physics.bounce; }
      if (y - ball.r < topB) { y = topB + ball.r; vy = -vy * physics.bounce; }
      if (y + ball.r > bottomB) { y = bottomB - ball.r; vy = -vy * physics.bounce; }
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

  // No upgrade modals

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
  // Ensure canvas fills viewport
  function setCanvasToViewport() {
    const main = document.querySelector('.main');
    const rect = main.getBoundingClientRect();
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
  }
  window.addEventListener('resize', setCanvasToViewport);

  // Init
  resize();
  loadHole(0);
  requestAnimationFrame(loop);
})();

