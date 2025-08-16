// Spinnable Minecraft-style cube (90° FOV, crisp 16x16 texels)
// Fun extras: hover swap + glow, outline bounce, ring pulses, spin trails, click bounce/sparkles,
// idle bob, smooth zoom (wheel/pinch) with inertia, double-click face focus, keyboard controls, gyro tilt, SFX
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('scene');

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera (perspective, 90° FOV)
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 100);
let targetCameraZ = 3.6;
camera.position.set(0, 0, targetCameraZ);
camera.lookAt(0, 0, 0);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambient);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(3, 5, 2);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x7a88ff, 0.35);
rimLight.position.set(-3, 2, -4);
scene.add(rimLight);

// --- Pixel-art textures (true 16x16 per face, nearest filtering) ---
function makeCanvasTexture(drawFn, size = 16) {
	const c = document.createElement('canvas');
	c.width = c.height = size;
	const ctx = c.getContext('2d', { willReadFrequently: true });
	drawFn(ctx, size);
	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.wrapS = THREE.ClampToEdgeWrapping;
	tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.magFilter = THREE.NearestFilter;
	tex.minFilter = THREE.NearestFilter;
	tex.generateMipmaps = false;
	tex.needsUpdate = true;
	return tex;
}

function rand(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

function drawGrassTop(ctx, S) {
	// Gradient base (slightly darker bottom-left to brighter top-right)
	for (let y = 0; y < S; y++) {
		for (let x = 0; x < S; x++) {
			const t = (x + y) / (S * 2);
			const g = 100 + Math.floor(t * 60);
			const r = 30 + Math.floor(t * 20);
			const b = 30 + Math.floor(t * 12);
			ctx.fillStyle = `rgb(${r},${g},${b})`;
			ctx.fillRect(x, y, 1, 1);
		}
	}
	// Random blades/highlights
	for (let y = 0; y < S; y++) {
		for (let x = 0; x < S; x++) {
			if (Math.random() < 0.18) {
				const g = rand(140, 190);
				const r = rand(30, 60);
				const b = rand(30, 60);
				ctx.fillStyle = `rgb(${r},${g},${b})`;
				ctx.fillRect(x, y, 1, 1);
			}
		}
	}
	// Occasional brighter dew pixels
	for (let i = 0; i < 6; i++) {
		ctx.fillStyle = `rgb(${rand(180,220)},${rand(240,255)},${rand(180,220)})`;
		ctx.fillRect(rand(0,S-1), rand(0,S-1), 1, 1);
	}
}

function drawDirtSide(ctx, S) {
	// Base dirt
	for (let y = 0; y < S; y++) {
		for (let x = 0; x < S; x++) {
			const r = rand(90, 130);
			const g = rand(55, 80);
			const b = rand(35, 55);
			ctx.fillStyle = `rgb(${r},${g},${b})`;
			ctx.fillRect(x, y, 1, 1);
		}
	}
	// Grass lip (top 3 px)
	for (let y = 0; y < 3; y++) {
		for (let x = 0; x < S; x++) {
			const g = rand(120, 180);
			const r = rand(30, 60);
			const b = rand(30, 60);
			ctx.fillStyle = `rgb(${r},${g},${b})`;
			ctx.fillRect(x, y, 1, 1);
		}
	}
	// Grass strands hanging down
	for (let x = 0; x < S; x++) {
		if (Math.random() < 0.35) {
			const len = rand(1, 3);
			for (let y = 3; y < 3 + len && y < S; y++) {
				ctx.fillStyle = `rgb(${rand(30,60)},${rand(110,160)},${rand(30,60)})`;
				ctx.fillRect(x, y, 1, 1);
			}
		}
	}
	// Pebbles (rare lighter pixels)
	for (let i = 0; i < 18; i++) {
		ctx.fillStyle = `rgb(${rand(140,180)},${rand(110,130)},${rand(90,110)})`;
		ctx.fillRect(rand(0,S-1), rand(3,S-1), 1, 1);
	}
}

function drawDirtBottom(ctx, S) {
	for (let y = 0; y < S; y++) {
		for (let x = 0; x < S; x++) {
			const r = rand(85, 120);
			const g = rand(50, 75);
			const b = rand(30, 50);
			ctx.fillStyle = `rgb(${r},${g},${b})`;
			ctx.fillRect(x, y, 1, 1);
			if (Math.random() < 0.18) {
				ctx.fillStyle = `rgb(${rand(100,140)},${rand(70,90)},${rand(45,65)})`;
				ctx.fillRect(x, y, 1, 1);
			}
		}
	}
}

const texTop = makeCanvasTexture(drawGrassTop, 16);
const texSide = makeCanvasTexture(drawDirtSide, 16);
const texBottom = makeCanvasTexture(drawDirtBottom, 16);

const faceMaterials = [
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.95, metalness: 0.0, flatShading: true, emissive: 0x000000, emissiveIntensity: 0.0 }), // +X
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.95, metalness: 0.0, flatShading: true, emissive: 0x000000, emissiveIntensity: 0.0 }), // -X
	new THREE.MeshStandardMaterial({ map: texTop,  roughness: 0.95, metalness: 0.0, flatShading: true, emissive: 0x000000, emissiveIntensity: 0.0 }), // +Y
	new THREE.MeshStandardMaterial({ map: texBottom, roughness: 0.98, metalness: 0.0, flatShading: true, emissive: 0x000000, emissiveIntensity: 0.0 }), // -Y
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.95, metalness: 0.0, flatShading: true, emissive: 0x000000, emissiveIntensity: 0.0 }), // +Z
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.95, metalness: 0.0, flatShading: true, emissive: 0x000000, emissiveIntensity: 0.0 })  // -Z
];

// Cube
const cubeSize = 1.8;
const cube = new THREE.Mesh(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), faceMaterials);
cube.position.set(0, 0, 0);
scene.add(cube);

// Edge lines for crispness
const edges = new THREE.LineSegments(
	new THREE.EdgesGeometry(cube.geometry),
	new THREE.LineBasicMaterial({ color: 0xd4af37, linewidth: 1 })
);
scene.add(edges);

// Interaction planes (parented to cube so they rotate with it)
const interactionGroup = new THREE.Group();
cube.add(interactionGroup);
const half = cubeSize / 2;
const faceDefs = [
	{ name: 'right',  normal: new THREE.Vector3( 1, 0, 0), rot: [0, Math.PI/2, 0], pos: [ half, 0, 0], materialIndex: 0 },
	{ name: 'left',   normal: new THREE.Vector3(-1, 0, 0), rot: [0, -Math.PI/2, 0], pos: [-half, 0, 0], materialIndex: 1 },
	{ name: 'top',    normal: new THREE.Vector3( 0, 1, 0), rot: [-Math.PI/2, 0, 0], pos: [ 0,  half, 0], materialIndex: 2 },
	{ name: 'bottom', normal: new THREE.Vector3( 0,-1, 0), rot: [ Math.PI/2, 0, 0], pos: [ 0, -half, 0], materialIndex: 3 },
	{ name: 'front',  normal: new THREE.Vector3( 0, 0, 1), rot: [0, 0, 0],           pos: [ 0, 0,  half], materialIndex: 4 },
	{ name: 'back',   normal: new THREE.Vector3( 0, 0,-1), rot: [0, Math.PI, 0],     pos: [ 0, 0, -half], materialIndex: 5 },
];
for (const def of faceDefs) {
	const plane = new THREE.Mesh(
		new THREE.PlaneGeometry(cubeSize, cubeSize),
		new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthTest: true })
	);
	plane.position.set(...def.pos);
	plane.rotation.set(...def.rot);
	plane.userData = { def };
	interactionGroup.add(plane);
}

// Hover glow sprite
const glowTex = new THREE.TextureLoader().load('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="white" stop-opacity="1"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="32" r="28" fill="url(%23g)"/></svg>');
const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xd4af37, transparent: true, opacity: 0.0, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending });
const glowSprite = new THREE.Sprite(glowMat);
glowSprite.scale.set(1.35, 1.35, 1.35);
scene.add(glowSprite);

// Ring pulse sprite (for pulses on hover/click)
const ringTex = new THREE.TextureLoader().load('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><radialGradient id="rg" cx="50%" cy="50%" r="50%"><stop offset="70%" stop-color="white" stop-opacity="1"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient></defs><circle cx="64" cy="64" r="54" fill="none" stroke="url(%23rg)" stroke-width="10"/></svg>');
const ringPulses = [];
function spawnRingPulse(worldPos, colorHex = 0xd4af37) {
	const mat = new THREE.SpriteMaterial({ map: ringTex, color: colorHex, transparent: true, opacity: 0.9, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending });
	const s = new THREE.Sprite(mat);
	s.position.copy(worldPos);
	s.scale.set(0.3, 0.3, 0.3);
	s.userData = { birth: performance.now(), life: 700 };
	ringPulses.push(s);
	scene.add(s);
}

// Particles (sparkles, trails)
const particlesParent = new THREE.Group();
scene.add(particlesParent);
function spawnParticles(colorHex, originWorld, normalWorld, count = 60, speed = 0.6) {
	const geom = new THREE.BufferGeometry();
	const positions = new Float32Array(count * 3);
	const velocities = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);
	const base = new THREE.Color(colorHex);
	for (let i = 0; i < count; i++) {
		const dir = new THREE.Vector3(
			(Math.random() * 2 - 1),
			(Math.random() * 2 - 1),
			(Math.random() * 2 - 1)
		).normalize().multiplyScalar(Math.random() * 0.4 + 0.1);
		dir.add(normalWorld.clone().multiplyScalar(Math.random() * 0.8 + 0.2));
		const vx = dir.x * speed * (0.4 + Math.random() * 0.8);
		const vy = dir.y * speed * (0.4 + Math.random() * 0.8);
		const vz = dir.z * speed * (0.4 + Math.random() * 0.8);
		positions[i*3 + 0] = originWorld.x;
		positions[i*3 + 1] = originWorld.y;
		positions[i*3 + 2] = originWorld.z;
		velocities[i*3 + 0] = vx;
		velocities[i*3 + 1] = vy;
		velocities[i*3 + 2] = vz;
		const tint = 0.8 + Math.random() * 0.4;
		colors[i*3 + 0] = base.r * tint;
		colors[i*3 + 1] = base.g * tint;
		colors[i*3 + 2] = base.b * tint;
	}
	geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geom.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
	geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
	const mat = new THREE.PointsMaterial({ size: 0.05, sizeAttenuation: true, transparent: true, opacity: 1.0, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending });
	const points = new THREE.Points(geom, mat);
	points.userData = { birth: performance.now(), life: 1000 + Math.random()*600 };
	particlesParent.add(points);
}

function spawnSpinTrail() {
	const corners = [
		new THREE.Vector3( half,  half,  half),
		new THREE.Vector3( half,  half, -half),
		new THREE.Vector3( half, -half,  half),
		new THREE.Vector3( half, -half, -half),
		new THREE.Vector3(-half,  half,  half),
		new THREE.Vector3(-half,  half, -half),
		new THREE.Vector3(-half, -half,  half),
		new THREE.Vector3(-half, -half, -half),
	];
	const corner = corners[Math.floor(Math.random()*corners.length)].clone().applyMatrix4(cube.matrixWorld);
	const normal = corner.clone().sub(cube.getWorldPosition(new THREE.Vector3())).normalize();
	spawnParticles(0xffe099, corner, normal, 30, 1.1);
}

// Minimal SFX
let audioCtx;
let audioEnabled = true;
function getAudio() {
	if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	return audioCtx;
}
function playSfx(type = 'hover') {
	if (!audioEnabled) return;
	const ctx = getAudio();
	const now = ctx.currentTime;
	const master = ctx.createGain();
	master.gain.value = 0.12;
	master.connect(ctx.destination);
	const env = ctx.createGain();
	env.gain.value = 0.0;
	env.connect(master);
	function blip(freq, dur = 0.12, t0 = now, type = 'triangle') {
		const o = ctx.createOscillator();
		o.type = type;
		o.frequency.setValueAtTime(freq, t0);
		o.connect(env);
		o.start(t0);
		o.stop(t0 + dur);
	}
	switch (type) {
		case 'hover':
			blip(880); blip(1320, 0.1, now + 0.04);
			env.gain.setValueAtTime(0.0001, now);
			env.gain.exponentialRampToValueAtTime(0.9, now + 0.02);
			env.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
			break;
		case 'click':
			blip(420, 0.08, now, 'sawtooth'); blip(560, 0.08, now + 0.03, 'sawtooth');
			env.gain.setValueAtTime(0.0001, now);
			env.gain.exponentialRampToValueAtTime(0.8, now + 0.02);
			env.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
			break;
		case 'whoosh': {
			const noise = ctx.createBufferSource();
			const len = Math.floor(0.4 * ctx.sampleRate);
			const buf = ctx.createBuffer(1, len, ctx.sampleRate);
			const data = buf.getChannelData(0);
			for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
			noise.buffer = buf;
			const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 0.6;
			noise.connect(bp); bp.connect(env);
			noise.start(now); noise.stop(now + 0.4);
			env.gain.setValueAtTime(0.0001, now);
			env.gain.exponentialRampToValueAtTime(0.8, now + 0.03);
			env.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
			break;
		}
	}
}
window.addEventListener('pointerdown', () => { try { getAudio().resume(); } catch (e) {} }, { once: true });

// Interaction state
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredPlane = null;
let isDragging = false;
let lastX = 0, lastY = 0;
let velX = 0, velY = 0;
let targetScale = 1.0;
let currentScale = 1.0;
let scaleVel = 0.0;
let glowTarget = 0.0;
let glowOpacity = 0.0;
let lastTrailTime = 0;
let shake = 0.0;

function setPointerFromEvent(ev) {
	const rect = renderer.domElement.getBoundingClientRect();
	const x = ( (ev.clientX - rect.left) / rect.width ) * 2 - 1;
	const y = - ( (ev.clientY - rect.top) / rect.height ) * 2 + 1;
	pointer.set(x, y);
}

function faceTargetQuaternion(def) {
	const e = new THREE.Euler(def.rot[0], def.rot[1], def.rot[2], 'XYZ');
	const q = new THREE.Quaternion().setFromEuler(e);
	q.invert();
	return q;
}
let focusTargetQuat = null;

// Drag rotation with inertia + hover handling
canvas.addEventListener('pointerdown', (e) => {
	isDragging = true;
	lastX = e.clientX;
	lastY = e.clientY;
	focusTargetQuat = null;
	try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});

window.addEventListener('pointerup', (e) => {
	isDragging = false;
	try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
});

window.addEventListener('pointermove', (e) => {
	setPointerFromEvent(e);
	if (isDragging) {
		const dx = e.clientX - lastX;
		const dy = e.clientY - lastY;
		lastX = e.clientX;
		lastY = e.clientY;
		velX = dy * 0.005;
		velY = dx * 0.005;
		cube.rotation.x += velX;
		cube.rotation.y += velY;
	} else {
		raycaster.setFromCamera(pointer, camera);
		const hits = raycaster.intersectObjects(interactionGroup.children, false);
		if (hits.length) {
			const hit = hits[0].object;
			if (hoveredPlane !== hit) {
				if (hoveredPlane) {
					const prevMat = faceMaterials[hoveredPlane.userData.def.materialIndex];
					prevMat.emissiveIntensity = 0.0;
					prevMat.emissive.setHex(0x000000);
				}
				hoveredPlane = hit;
				const { materialIndex, normal } = hit.userData.def;
				const mat = faceMaterials[materialIndex];
				mat.emissive.setHex(0x7a5cff);
				mat.emissiveIntensity = 0.42;
				targetScale = 1.08;
				glowTarget = 0.9;
				canvas.style.cursor = 'pointer';
				const worldPos = hit.getWorldPosition(new THREE.Vector3());
				const worldNormal = normal.clone().applyQuaternion(cube.getWorldQuaternion(new THREE.Quaternion()));
				const colorByFace = [0xcaa36a, 0xcaa36a, 0x6bdc6e, 0xa0643c, 0xcaa36a, 0xcaa36a];
				spawnParticles(colorByFace[materialIndex], worldPos, worldNormal, 60, 0.6);
				spawnRingPulse(worldPos, 0xd4af37);
				playSfx('hover');
			}
			const pos = hit.getWorldPosition(new THREE.Vector3());
			glowSprite.position.copy(pos);
			glowSprite.lookAt(camera.position);
		} else {
			if (hoveredPlane) {
				const prevMat = faceMaterials[hoveredPlane.userData.def.materialIndex];
				prevMat.emissiveIntensity = 0.0;
				prevMat.emissive.setHex(0x000000);
			}
			hoveredPlane = null;
			targetScale = 1.0;
			glowTarget = 0.0;
			canvas.style.cursor = 'default';
		}
	}
});

// Click interactions
canvas.addEventListener('click', () => {
	if (!hoveredPlane) return;
	scaleVel -= 0.15; // bounce impulse
	velY += 0.06; velX -= 0.04;
	const { materialIndex, normal } = hoveredPlane.userData.def;
	const worldPos = hoveredPlane.getWorldPosition(new THREE.Vector3());
	const worldNormal = normal.clone().applyQuaternion(cube.getWorldQuaternion(new THREE.Quaternion()));
	const colorByFace = [0xffd37a, 0xffd37a, 0x88ff88, 0xd08a55, 0xffd37a, 0xffd37a];
	spawnParticles(colorByFace[materialIndex], worldPos, worldNormal, 120, 1.0);
	spawnRingPulse(worldPos, 0xffe699);
	shake = Math.min(0.02, shake + 0.01);
	playSfx('click');
});

// Double-click: focus hovered face (rotate cube)
canvas.addEventListener('dblclick', () => {
	if (!hoveredPlane) return;
	const def = hoveredPlane.userData.def;
	focusTargetQuat = faceTargetQuaternion(def);
	// Slight zoom-in
	targetCameraZ = Math.max(2.2, camera.position.z * 0.9);
	playSfx('whoosh');
});

// Wheel dolly zoom (scroll up -> zoom in) with inertia
function setCameraZ(z) { targetCameraZ = Math.max(1.2, Math.min(12, z)); }
window.addEventListener('wheel', (e) => {
	e.preventDefault();
	const factor = Math.exp(e.deltaY * 0.001); // inverted
	setCameraZ(camera.position.z * factor);
}, { passive: false });

// Pinch zoom support
const activePointers = new Map();
let pinchLastDist = 0;
function getActivePointerArray() { return Array.from(activePointers.values()); }
canvas.addEventListener('pointerdown', (e) => { activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
canvas.addEventListener('pointerup',   (e) => { activePointers.delete(e.pointerId); pinchLastDist = 0; });
canvas.addEventListener('pointercancel', (e) => { activePointers.delete(e.pointerId); pinchLastDist = 0; });
canvas.addEventListener('pointermove', (e) => {
	if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
	const pts = getActivePointerArray();
	if (pts.length === 2) {
		const dx = pts[0].x - pts[1].x;
		const dy = pts[0].y - pts[1].y;
		const dist = Math.hypot(dx, dy);
		if (pinchLastDist > 0) {
			const factor = pinchLastDist / dist;
			setCameraZ(camera.position.z * factor);
		}
		pinchLastDist = dist;
	} else {
		pinchLastDist = 0;
	}
});

// Keyboard controls
window.addEventListener('keydown', (e) => {
	switch (e.code) {
		case 'ArrowLeft': cube.rotation.y -= 0.15; break;
		case 'ArrowRight': cube.rotation.y += 0.15; break;
		case 'ArrowUp': cube.rotation.x -= 0.15; break;
		case 'ArrowDown': cube.rotation.x += 0.15; break;
		case 'Equal': case 'NumpadAdd': setCameraZ(camera.position.z * 0.9); break;
		case 'Minus': case 'NumpadSubtract': setCameraZ(camera.position.z * 1.1); break;
		case 'Space': scaleVel -= 0.12; break; // bounce
		case 'KeyF': if (hoveredPlane) { focusTargetQuat = faceTargetQuaternion(hoveredPlane.userData.def); playSfx('whoosh'); } break;
	}
});

// Gyro tilt on mobile
let tiltX = 0, tiltY = 0;
if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
	// iOS permission flow
	window.addEventListener('click', async function onFirstClick() {
		try { await DeviceOrientationEvent.requestPermission(); } catch (e) {}
		window.removeEventListener('click', onFirstClick);
	});
}
window.addEventListener('deviceorientation', (e) => {
	const ax = (e.beta || 0) * (Math.PI / 180);
	const ay = (e.gamma || 0) * (Math.PI / 180);
	tiltX = ax * 0.05; // damped
	tiltY = ay * 0.05;
});

// Idle bob for flair
let bobPhase = 0;

function animate(now = 0) {
	requestAnimationFrame(animate);
	// Smooth zoom
	camera.position.z += (targetCameraZ - camera.position.z) * 0.15;
	// Screen shake
	if (shake > 0.0001) { shake *= 0.9; camera.position.x = (Math.random()-0.5) * shake; camera.position.y = (Math.random()-0.5) * shake; } else { camera.position.x = 0; camera.position.y = 0; }
	camera.lookAt(0, 0, 0);
	// Springy scale
	const stiffness = 0.18; const damping = 0.78;
	const force = (targetScale - currentScale) * stiffness;
	scaleVel = scaleVel * damping + force;
	currentScale += scaleVel;
	cube.scale.set(currentScale, currentScale, currentScale);
	// If focusing a face, slerp towards it
	if (focusTargetQuat) {
		cube.quaternion.slerp(focusTargetQuat, 0.15);
		if (cube.quaternion.angleTo(focusTargetQuat) < 0.005) focusTargetQuat = null;
	}
	// Edges sync
	edges.position.copy(cube.position);
	edges.rotation.copy(cube.rotation);
	edges.scale.copy(cube.scale);
	// Glow pulse
	glowOpacity += (glowTarget - glowOpacity) * 0.12;
	glowMat.opacity = glowOpacity * (0.85 + 0.15 * Math.sin(now * 0.012));
	const pulse = 1.15 + 0.15 * Math.sin(now * 0.01);
	glowSprite.scale.set(pulse, pulse, pulse);
	// Inertia
	if (!isDragging && !focusTargetQuat) {
		cube.rotation.y += (velY *= 0.95);
		cube.rotation.x += (velX *= 0.95);
	}
	// Gyro tilt (additive)
	cube.rotation.x += (tiltX - 0) * 0.02;
	cube.rotation.y += (tiltY - 0) * 0.02;
	// Idle bob
	bobPhase += 0.0025;
	cube.position.y = Math.sin(bobPhase) * 0.02;
	edges.position.y = cube.position.y;
	// Spin trails based on angular speed
	const spinSpeed = Math.abs(velX) + Math.abs(velY);
	if (spinSpeed > 0.035 && now - lastTrailTime > 60) { spawnSpinTrail(); lastTrailTime = now; }
	// Update particles
	const nowMs = performance.now();
	for (let i = particlesParent.children.length - 1; i >= 0; i--) {
		const p = particlesParent.children[i];
		const life = p.userData.life;
		const age = nowMs - p.userData.birth;
		if (age > life) { particlesParent.remove(p); p.geometry.dispose(); p.material.dispose(); continue; }
		const t = age / life;
		const positions = p.geometry.getAttribute('position');
		const velocities = p.geometry.getAttribute('velocity');
		for (let j = 0; j < positions.count; j++) {
			positions.array[j*3 + 0] += velocities.array[j*3 + 0] * 0.016;
			positions.array[j*3 + 1] += velocities.array[j*3 + 1] * 0.016;
			positions.array[j*3 + 2] += velocities.array[j*3 + 2] * 0.016;
			velocities.array[j*3 + 1] += 0.0006; // gentle up drift
		}
		positions.needsUpdate = true;
		p.material.opacity = 1.0 - t;
	}
	// Update ring pulses
	for (let i = ringPulses.length - 1; i >= 0; i--) {
		const s = ringPulses[i];
		const age = nowMs - s.userData.birth;
		const t = age / s.userData.life;
		if (t >= 1) { scene.remove(s); ringPulses.splice(i, 1); continue; }
		s.scale.setScalar(0.3 + t * 1.6);
		s.material.opacity = (1 - t) * 0.9;
		s.lookAt(camera.position);
	}
	// Subtle edge shimmer
	const huePulse = (Math.sin(now * 0.0015) * 0.5 + 0.5) * 0.2 + 0.6;
	const r = 180 + Math.floor(huePulse * 40);
	const g = 140 + Math.floor(huePulse * 20);
	const b = 60 + Math.floor(huePulse * 10);
	edges.material.color.setRGB(r/255, g/255, b/255);
	// Render
	renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// Resize handling
window.addEventListener('resize', () => {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
});