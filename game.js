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

  // Simple level data
  const holes = [
    { par: 3, tee: { x: 140, y: 420 }, cup: { x: 780, y: 120 }, walls: [
      { x: 100, y: 80, w: 20, h: 380 },
      { x: 100, y: 80, w: 760, h: 20 },
      { x: 100, y: 440, w: 760, h: 20 },
      { x: 860, y: 80, w: 20, h: 380 },
      { x: 360, y: 240, w: 260, h: 20 },
    ]},
    { par: 2, tee: { x: 160, y: 380 }, cup: { x: 760, y: 180 }, walls: [
      { x: 80, y: 80, w: 800, h: 20 },
      { x: 80, y: 440, w: 800, h: 20 },
      { x: 80, y: 80, w: 20, h: 380 },
      { x: 860, y: 80, w: 20, h: 380 },
      { x: 420, y: 180, w: 20, h: 220 },
      { x: 540, y: 180, w: 20, h: 220 },
    ]},
  ];

  let holeIndex = 0;
  let strokes = 0;
  let bestByHole = JSON.parse(localStorage.getItem('golf:best') || '[]');

  const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 8, rolling: false };
  const physics = { friction: 0.985, stop: 0.08, bounce: 0.85, maxPower: 16 };

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

  function saveBest() {
    if (bestByHole[holeIndex] == null || strokes < bestByHole[holeIndex]) {
      bestByHole[holeIndex] = strokes;
      localStorage.setItem('golf:best', JSON.stringify(bestByHole));
      bestEl.textContent = String(strokes);
    }
  }

  // Input handling
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  canvas.addEventListener('mousedown', (e) => {
    const { x, y } = toLocal(e);
    if (!ball.rolling) {
      isDragging = true;
      dragStart = { x, y };
    }
  });
  window.addEventListener('mousemove', (e) => { if (isDragging) { draw(toLocal(e)); } });
  window.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    const { x, y } = toLocal(e);
    const dx = dragStart.x - x;
    const dy = dragStart.y - y;
    const mag = Math.hypot(dx, dy);
    const n = Math.min(physics.maxPower, mag / 12);
    const angle = Math.atan2(dy, dx);
    ball.vx = n * Math.cos(angle);
    ball.vy = n * Math.sin(angle);
    ball.rolling = true; isDragging = false; strokes += 1; strokesEl.textContent = String(strokes);
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

    // Borders
    if (ball.x - ball.r < 80) { ball.x = 80 + ball.r; ball.vx = -ball.vx * physics.bounce; }
    if (ball.x + ball.r > 880) { ball.x = 880 - ball.r; ball.vx = -ball.vx * physics.bounce; }
    if (ball.y - ball.r < 80) { ball.y = 80 + ball.r; ball.vy = -ball.vy * physics.bounce; }
    if (ball.y + ball.r > 460) { ball.y = 460 - ball.r; ball.vy = -ball.vy * physics.bounce; }

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

  // Rendering
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
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let w of holes[holeIndex].walls) ctx.fillRect(w.x, w.y, w.w, w.h);

    // Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.r);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#cfd8ea');
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke();

    // Aim line
    if (isDragging && aimPos) {
      ctx.strokeStyle = 'rgba(56,217,150,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(aimPos.x, aimPos.y); ctx.stroke();
      // Power indicator
      const power = Math.min(physics.maxPower, Math.hypot(ball.x - aimPos.x, ball.y - aimPos.y) / 12);
      ctx.fillStyle = 'rgba(56,217,150,0.25)';
      ctx.fillRect(24, 24, power * 24, 8);
      ctx.strokeStyle = 'rgba(56,217,150,0.6)';
      ctx.strokeRect(24, 24, physics.maxPower * 24, 8);
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

  // Game loop
  let last = 0;
  function loop(ts) {
    if (!last) last = ts; const dt = Math.min(32, ts - last); last = ts;
    step(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Controls
  resetBtn.addEventListener('click', () => loadHole(holeIndex));
  nextBtn.addEventListener('click', () => loadHole((holeIndex + 1) % holes.length));

  window.addEventListener('resize', resize);

  // Init
  resize();
  loadHole(0);
  requestAnimationFrame(loop);
})();

