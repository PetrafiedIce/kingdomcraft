/* KingdomCraft Interactive Block */
(function(){
  const TWO_PI = Math.PI * 2;
  const container = document.getElementById('kc-canvas-container');
  const overlay = document.getElementById('kc-overlay');
  const audioToggleBtn = document.getElementById('kc-audio-toggle');

  let width = container.clientWidth;
  let height = container.clientHeight;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  // Three.js essentials
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(2.6, 1.8, 3.2);
  camera.lookAt(0, 0, 0);

  // Lighting
  const hemiLight = new THREE.HemisphereLight(0xbccbe0, 0x1a1108, 0.9);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfff6d5, 1.0);
  dirLight.position.set(5, 8, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 20;
  scene.add(dirLight);

  // Subtle ground for shadows
  const groundGeo = new THREE.CircleGeometry(5, 64);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.25 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.51;
  ground.receiveShadow = true;
  scene.add(ground);

  // Block group (6 plane faces) for precise face picking
  const blockGroup = new THREE.Group();
  scene.add(blockGroup);

  const blockSize = 1.0;
  const half = blockSize / 2;

  // Textures (Minecraft-like)
  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin('anonymous');

  // Use public CDN textures (subject to availability). Feel free to host locally for production.
  const TEX = {
    top: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.1/assets/minecraft/textures/block/grass_block_top.png',
    side: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.1/assets/minecraft/textures/block/grass_block_side.png',
    bottom: 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.16.1/assets/minecraft/textures/block/dirt.png'
  };

  function loadNearestTexture(url) {
    return new Promise((resolve, reject) => {
      textureLoader.load(url, (tx) => {
        tx.magFilter = THREE.NearestFilter;
        tx.minFilter = THREE.NearestFilter;
        tx.generateMipmaps = false;
        tx.anisotropy = 1;
        resolve(tx);
      }, undefined, (err) => reject(err));
    });
  }

  // Particles
  const particleGroup = new THREE.Group();
  scene.add(particleGroup);
  const activeEmitters = [];

  function makeCircleSpriteTexture() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.65, 'rgba(255,255,255,0.2)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
    ctx.fill();
    const tx = new THREE.CanvasTexture(c);
    tx.minFilter = THREE.LinearFilter;
    tx.magFilter = THREE.LinearFilter;
    tx.needsUpdate = true;
    return tx;
  }
  const particleSprite = makeCircleSpriteTexture();

  function emitBurst(options) {
    const {
      center = new THREE.Vector3(),
      normal = new THREE.Vector3(0,0,1),
      count = 120,
      color = new THREE.Color('#d1b87f'),
      spread = 0.8,
      speed = 2.2,
      gravity = 0.0,
      life = 1.2,
      swirl = false
    } = options || {};

    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const accel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TWO_PI;
      const radius = Math.random() * spread * 0.25;
      const vx = Math.cos(angle) * radius;
      const vy = (Math.random() - 0.5) * radius * 0.6;
      const vz = Math.sin(angle) * radius;

      const dir = new THREE.Vector3(vx, vy, vz).addScaledVector(normal, spread).normalize();
      const spd = speed * (0.7 + Math.random() * 0.6);
      const vel = dir.multiplyScalar(spd);

      positions[i*3+0] = center.x;
      positions[i*3+1] = center.y;
      positions[i*3+2] = center.z;

      velocities[i*3+0] = vel.x;
      velocities[i*3+1] = vel.y;
      velocities[i*3+2] = vel.z;

      accel[i*3+0] = 0;
      accel[i*3+1] = -gravity;
      accel[i*3+2] = 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.04,
      map: particleSprite,
      color,
      transparent: true,
      depthWrite: false,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    particleGroup.add(points);

    const emitter = {
      obj: points,
      positions,
      velocities,
      accel,
      age: 0,
      life,
      swirl,
      center: center.clone(),
      normal: normal.clone(),
      update(dt) {
        this.age += dt;
        const t = this.age / this.life;
        const count = this.positions.length / 3;
        for (let i = 0; i < count; i++) {
          let vx = this.velocities[i*3+0];
          let vy = this.velocities[i*3+1];
          let vz = this.velocities[i*3+2];

          if (this.swirl) {
            // Apply simple swirl around normal
            const swirlStrength = 2.0 * (1.0 - t);
            const n = this.normal;
            // rotate velocity around normal
            const vel = new THREE.Vector3(vx, vy, vz);
            vel.applyAxisAngle(n, swirlStrength * dt);
            vx = vel.x; vy = vel.y; vz = vel.z;
            this.velocities[i*3+0] = vx;
            this.velocities[i*3+1] = vy;
            this.velocities[i*3+2] = vz;
          }

          // integrate
          this.velocities[i*3+0] += this.accel[i*3+0] * dt;
          this.velocities[i*3+1] += this.accel[i*3+1] * dt;
          this.velocities[i*3+2] += this.accel[i*3+2] * dt;

          this.positions[i*3+0] += vx * dt;
          this.positions[i*3+1] += vy * dt;
          this.positions[i*3+2] += vz * dt;
        }
        this.obj.geometry.attributes.position.needsUpdate = true;
        this.obj.material.opacity = 1.0 - t;
      }
    };

    activeEmitters.push(emitter);
    return emitter;
  }

  // Audio via Howler
  const AudioState = {
    enabled: true,
    sounds: {}
  };
  function initSounds() {
    const make = (urls) => new Howl({ src: urls, volume: 0.7 });
    AudioState.sounds = {
      top: make([
        'https://cdn.pixabay.com/download/audio/2023/08/29/audio_56803d8221.mp3?filename=angelic-choir-146059.mp3'
      ]),
      front: make([
        'https://cdn.pixabay.com/download/audio/2021/09/18/audio_58e4b67841.mp3?filename=whoosh-6316.mp3'
      ]),
      left: make([
        'https://cdn.pixabay.com/download/audio/2022/03/15/audio_1a40e3a297.mp3?filename=page-turn-110151.mp3'
      ]),
      right: make([
        'https://cdn.pixabay.com/download/audio/2022/03/10/audio_9fd527d38f.mp3?filename=coins-6331.mp3'
      ]),
      back: make([
        'https://cdn.pixabay.com/download/audio/2021/08/04/audio_6f62d49b55.mp3?filename=wind-blowing-ambient-6585.mp3'
      ]),
      bottom: make([
        'https://cdn.pixabay.com/download/audio/2022/03/10/audio_75fe6132ab.mp3?filename=deep-rumble-47666.mp3'
      ])
    };
  }
  initSounds();

  audioToggleBtn.addEventListener('click', () => {
    const pressed = audioToggleBtn.getAttribute('aria-pressed') === 'true';
    const next = !pressed;
    audioToggleBtn.setAttribute('aria-pressed', String(next));
    audioToggleBtn.textContent = next ? '🔊' : '🔈';
    AudioState.enabled = next;
    if (!next) Howler.mute(true); else Howler.mute(false);
  });

  // Routes for each face
  const routes = {
    top: '/kingdom/castle',      // Top face -> Castle page
    front: '/kingdom/join',      // Front face -> Join page
    left: '/kingdom/rules',      // Left face -> Rules page
    right: '/kingdom/shop',      // Right face -> Shop page
    back: '/kingdom/forums',     // Back face -> Forums page
    bottom: '/kingdom/map'       // Bottom face -> Map page
  };

  // Build faces
  const facesSpec = [
    { key: 'front',  pos: [0, 0,  half], rot: [0, 0, 0],              tex: 'side' },
    { key: 'back',   pos: [0, 0, -half], rot: [0, Math.PI, 0],        tex: 'side' },
    { key: 'left',   pos: [-half, 0, 0], rot: [0, -Math.PI/2, 0],     tex: 'side' },
    { key: 'right',  pos: [ half, 0, 0], rot: [0,  Math.PI/2, 0],     tex: 'side' },
    { key: 'top',    pos: [0,  half, 0], rot: [-Math.PI/2, 0, 0],     tex: 'top'  },
    { key: 'bottom', pos: [0, -half, 0], rot: [ Math.PI/2, 0, 0],     tex: 'bottom' }
  ];

  Promise.all([
    loadNearestTexture(TEX.top),
    loadNearestTexture(TEX.side),
    loadNearestTexture(TEX.bottom)
  ]).then(([topTx, sideTx, bottomTx]) => {
    const texMap = { top: topTx, side: sideTx, bottom: bottomTx };
    const planeGeo = new THREE.PlaneGeometry(blockSize, blockSize);

    facesSpec.forEach(spec => {
      const mat = new THREE.MeshStandardMaterial({
        map: texMap[spec.tex],
        roughness: 1.0,
        metalness: 0.0,
        flatShading: true,
        side: THREE.DoubleSide,
        emissive: 0x000000,
        emissiveIntensity: 0.0
      });
      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      mesh.rotation.set(spec.rot[0], spec.rot[1], spec.rot[2]);
      mesh.name = `kc-face-${spec.key}`;
      mesh.userData.key = spec.key;
      mesh.userData.basePosition = mesh.position.clone();
      // compute outward normal in world space on demand
      blockGroup.add(mesh);
    });

    // Slight bevel edges using thin lines
    const edgeGeo = new THREE.BoxGeometry(blockSize + 0.002, blockSize + 0.002, blockSize + 0.002);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(edgeGeo), new THREE.LineBasicMaterial({ color: 0x2a2f3a, opacity: 0.6, transparent: true }));
    blockGroup.add(edges);

    start();
  }).catch((e) => {
    console.error('Texture load failed. Falling back to plain colors.', e);
    const planeGeo = new THREE.PlaneGeometry(blockSize, blockSize);
    facesSpec.forEach(spec => {
      const color = spec.key === 'top' ? 0x4caf50 : (spec.key === 'bottom' ? 0x8d6e63 : 0x6b8e4e);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 1.0, metalness: 0.0, flatShading: true, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      mesh.rotation.set(spec.rot[0], spec.rot[1], spec.rot[2]);
      mesh.name = `kc-face-${spec.key}`;
      mesh.userData.key = spec.key;
      mesh.userData.basePosition = mesh.position.clone();
      blockGroup.add(mesh);
    });
    start();
  });

  // Interaction
  const raycaster = new THREE.Raycaster();
  const mouseNdc = new THREE.Vector2();
  let hovered = null;
  let isTransitioning = false;

  function getFaceNormalWorld(mesh) {
    const q = mesh.getWorldQuaternion(new THREE.Quaternion());
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
    return n;
  }

  function onPointerMove(ev) {
    if (isTransitioning) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ( (ev.clientX - rect.left) / rect.width ) * 2 - 1;
    const y = - ( (ev.clientY - rect.top) / rect.height ) * 2 + 1;
    mouseNdc.set(x, y);

    raycaster.setFromCamera(mouseNdc, camera);
    const intersects = raycaster.intersectObjects(blockGroup.children.filter(o => o.isMesh), false);
    const target = intersects[0]?.object || null;
    if (target !== hovered) {
      if (hovered) clearHover(hovered);
      if (target) applyHover(target, intersects[0].point);
      hovered = target;
      container.style.cursor = hovered ? 'pointer' : 'default';
    }
  }

  function applyHover(mesh, point) {
    if (!mesh || !mesh.material) return;
    const mat = mesh.material;
    gsap.to(mat, { duration: 0.2, emissiveIntensity: 0.55, onStart: () => mat.emissive.set('#2dff96') });

    const n = getFaceNormalWorld(mesh);
    const offset = n.clone().multiplyScalar(0.02);
    const targetPos = mesh.userData.basePosition.clone().add(offset.applyQuaternion(mesh.parent.quaternion.clone().invert()));
    gsap.to(mesh.position, { duration: 0.2, x: targetPos.x, y: targetPos.y, z: targetPos.z });

    const localCenter = new THREE.Vector3();
    mesh.getWorldPosition(localCenter);
    emitBurst({ center: localCenter, normal: n, count: 18, color: new THREE.Color('#74ffd7'), spread: 0.5, speed: 0.8, life: 0.6 });
  }
  function clearHover(mesh) {
    if (!mesh || !mesh.material) return;
    const mat = mesh.material;
    gsap.to(mat, { duration: 0.25, emissiveIntensity: 0.0, onComplete: () => mat.emissive.set('#000000') });
    const base = mesh.userData.basePosition;
    gsap.to(mesh.position, { duration: 0.25, x: base.x, y: base.y, z: base.z });
  }

  function onPointerDown() {
    if (!hovered || isTransitioning) return;
    triggerFaceTransition(hovered);
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true });
  renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
  renderer.domElement.addEventListener('pointerleave', () => {
    if (hovered) { clearHover(hovered); hovered = null; }
    container.style.cursor = 'default';
  }, { passive: true });

  // Continuous rotation and bob
  let spinTween = null;
  function startSpin() {
    if (spinTween) spinTween.kill();
    spinTween = gsap.to(blockGroup.rotation, { y: `+=${TWO_PI}`, duration: 14, ease: 'none', repeat: -1 });
    gsap.to(blockGroup.position, { y: '+=0.08', duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }
  function pauseSpin() {
    if (spinTween) spinTween.pause();
  }

  // Transition per face
  function themeForFace(key) {
    // Define overlay gradient colors and particle colors per face
    switch (key) {
      case 'top': return { overlayMid: 'rgba(74,175,80,0.35)', overlayTo: 'rgba(22, 38, 18, 0.95)', particle: '#7CFC98' };
      case 'front': return { overlayMid: 'rgba(126,87,194,0.35)', overlayTo: 'rgba(40, 22, 64, 0.95)', particle: '#B388FF' };
      case 'left': return { overlayMid: 'rgba(193,163,107,0.35)', overlayTo: 'rgba(72, 58, 32, 0.95)', particle: '#E5C88C' };
      case 'right': return { overlayMid: 'rgba(255,213,79,0.35)', overlayTo: 'rgba(76, 58, 6, 0.95)', particle: '#FFD54F' };
      case 'back': return { overlayMid: 'rgba(84,110,122,0.35)', overlayTo: 'rgba(18, 28, 32, 0.95)', particle: '#B0BEC5' };
      case 'bottom': return { overlayMid: 'rgba(141,110,99,0.35)', overlayTo: 'rgba(38, 24, 20, 0.95)', particle: '#D7CCC8' };
      default: return { overlayMid: 'rgba(209,184,127,0.35)', overlayTo: 'rgba(24, 18, 7, 0.95)', particle: '#d1b87f' };
    }
  }

  function triggerFaceTransition(mesh) {
    const key = mesh.userData.key;
    const theme = themeForFace(key);
    isTransitioning = true;

    // Sound
    if (AudioState.enabled && AudioState.sounds[key]) {
      try { AudioState.sounds[key].play(); } catch (e) {}
    }

    // Compute world center and normal
    const faceCenterWorld = new THREE.Vector3();
    mesh.getWorldPosition(faceCenterWorld);
    const faceNormalWorld = getFaceNormalWorld(mesh);

    // Emit themed particles
    emitBurst({
      center: faceCenterWorld,
      normal: faceNormalWorld,
      count: 220,
      color: new THREE.Color(theme.particle),
      spread: 1.2,
      speed: 2.8,
      gravity: 0.0,
      life: 1.4,
      swirl: key === 'front' || key === 'right'
    });

    // Accelerate spin briefly
    gsap.to(blockGroup.rotation, { y: `+=${Math.PI * 2}`, duration: 1.2, ease: 'power3.inOut' });

    // Move camera towards face
    const camTarget = faceCenterWorld.clone();
    const camPos = faceCenterWorld.clone().add(faceNormalWorld.clone().multiplyScalar(1.8));

    const overlayRect = renderer.domElement.getBoundingClientRect();
    const faceClip = worldToScreen(faceCenterWorld, camera, overlayRect);

    // Configure overlay theme and origin
    overlay.style.setProperty('--overlay-from', 'rgba(255,255,255,0)');
    overlay.style.setProperty('--overlay-mid', theme.overlayMid);
    overlay.style.setProperty('--overlay-to', theme.overlayTo);
    overlay.style.setProperty('--overlay-x', `${(faceClip.x * 100).toFixed(2)}%`);
    overlay.style.setProperty('--overlay-y', `${(faceClip.y * 100).toFixed(2)}%`);

    pauseSpin();

    const tl = gsap.timeline({ onComplete: () => {
      // Navigate after the iris wipe completes
      const url = routes[key] || '/';
      window.location.assign(url);
    }});

    tl.to(camera.position, { duration: 1.1, x: camPos.x, y: camPos.y, z: camPos.z, ease: 'power3.inOut', onUpdate: () => {
      camera.lookAt(camTarget);
    }});

    // Overlay iris wipe
    tl.to(overlay, { duration: 1.0, ease: 'power2.in', onStart: () => {
      overlay.style.setProperty('--overlay-r', '0%');
    }, onUpdate: function() {}, onComplete: function() {} }, '<');
    tl.to(overlay, { duration: 0.95, ease: 'power2.inOut', onStart: () => {}, onUpdate: function() {}, onComplete: function() {} });
    tl.to(overlay, { duration: 0.95, ease: 'power2.out', onStart: () => {}, onUpdate: function() {}, onComplete: function() {} });

    // Animate the CSS variable --overlay-r using GSAP CSS plugin
    tl.to(overlay, { duration: 1.15, ease: 'power3.out', onUpdate: function() {}, '--overlay-r': '150%' }, '<0.05');
  }

  function worldToScreen(worldVec, cam, rect) {
    const projected = worldVec.clone().project(cam);
    const x = (projected.x + 1) / 2;
    const y = (1 - projected.y) / 2;
    return { x, y };
  }

  // Main loop
  let lastTime = performance.now();
  function animate() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    for (let i = activeEmitters.length - 1; i >= 0; i--) {
      const e = activeEmitters[i];
      e.update(dt);
      if (e.age >= e.life) {
        particleGroup.remove(e.obj);
        e.obj.geometry.dispose();
        if (e.obj.material.map && e.obj.material.map !== particleSprite) e.obj.material.map.dispose();
        e.obj.material.dispose();
        activeEmitters.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function start() {
    startSpin();
    animate();
  }

  function onResize() {
    width = container.clientWidth;
    height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize, { passive: true });
})();