// KingdomCraft interactive block
// Dependencies: Three.js (ESM via unpkg), GSAP (ESM via unpkg)

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { gsap } from 'https://unpkg.com/gsap@3.12.5/index.js?module';

const appEl = document.getElementById('app');
const canvas = document.getElementById('scene');
const overlay = document.getElementById('transition');
const crestEl = overlay.querySelector('.crest');
const veilEl = overlay.querySelector('.veil');
const runesEl = overlay.querySelector('.runes');

// Audio setup
let audioCtx;
let unlockedAudio = false;
function getAudio() {
	if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	return audioCtx;
}
function unlockAudio() {
	if (unlockedAudio) return;
	try { getAudio().resume(); unlockedAudio = true; } catch (e) {}
}
window.addEventListener('pointerdown', unlockAudio, { once: true });

function playSfx(type = 'chime') {
	const ctx = getAudio();
	const now = ctx.currentTime;
	const master = ctx.createGain();
	master.gain.value = 0.18;
	master.connect(ctx.destination);

	const env = ctx.createGain();
	env.gain.value = 0.0;
	env.connect(master);

	const curveUp = [0.0001, 0.5, 1.0];
	const curveDown = [1.0, 0.4, 0.0001];

	function note(freq, t0, dur, type = 'sine') {
		const osc = ctx.createOscillator();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, t0);
		osc.connect(env);
		osc.start(t0);
		osc.stop(t0 + dur);
		return osc;
	}

	function noise(t0, dur, color = 'white') {
		const length = Math.floor(dur * ctx.sampleRate);
		const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < length; i++) {
			let v = Math.random() * 2 - 1;
			if (color === 'pink') v = (v + (Math.random() * 2 - 1)) * 0.5;
			data[i] = v * 0.6;
		}
		const src = ctx.createBufferSource();
		src.buffer = buffer;
		const filter = ctx.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.value = 800;
		filter.Q.value = 0.8;
		src.connect(filter);
		filter.connect(env);
		src.start(t0);
		src.stop(t0 + dur);
	}

	// Envelope
	env.gain.setValueAtTime(0.0001, now);
	env.gain.exponentialRampToValueAtTime(1.0, now + 0.01);

	switch (type) {
		case 'whoosh': {
			noise(now, 0.6, 'pink');
			env.gain.setValueAtTime(0.0001, now);
			env.gain.exponentialRampToValueAtTime(1.0, now + 0.08);
			env.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
			break;
		}
		case 'ember': {
			for (let i = 0; i < 3; i++) {
				note(200 + Math.random() * 40, now + i * 0.06, 0.12, 'triangle');
			}
			env.gain.setValueAtTime(0.0001, now);
			env.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
			env.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
			break;
		}
		case 'portal': {
			const o = note(520, now, 0.9, 'sawtooth');
			o.frequency.exponentialRampToValueAtTime(140, now + 0.9);
			env.gain.setValueAtTime(0.0001, now);
			env.gain.exponentialRampToValueAtTime(0.7, now + 0.04);
			env.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
			break;
		}
		default: {
			note(880, now, 0.15, 'triangle');
			note(660, now + 0.12, 0.15, 'triangle');
			note(440, now + 0.24, 0.2, 'triangle');
			env.gain.setValueAtTime(0.0001, now);
			env.gain.exponentialRampToValueAtTime(0.8, now + 0.02);
			env.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
		}
	}
}

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0a1f);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0.4, 4.2);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(3, 5, 2);
keyLight.castShadow = false;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x8a5cff, 0.6);
rimLight.position.set(-4, 2, -3);
scene.add(rimLight);

// Textures (procedural) for Minecraft-like look
function makeCanvasTexture(drawFn, size = 256) {
	const c = document.createElement('canvas');
	c.width = c.height = size;
	const ctx = c.getContext('2d');
	drawFn(ctx, size);
	const tex = new THREE.CanvasTexture(c);
	tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1;
	tex.magFilter = THREE.NearestFilter;
	tex.minFilter = THREE.LinearMipMapLinearFilter;
	tex.generateMipmaps = true;
	return tex;
}

function drawGrassTop(ctx, S) {
	ctx.fillStyle = '#4caf50';
	ctx.fillRect(0, 0, S, S);
	// pixelated pattern
	for (let y = 0; y < S; y += 8) {
		for (let x = 0; x < S; x += 8) {
			const g = 70 + Math.floor(Math.random() * 70);
			ctx.fillStyle = `rgb(${Math.floor(40 + Math.random()*30)}, ${g}, ${Math.floor(40 + Math.random()*30)})`;
			ctx.fillRect(x, y, 8, 8);
		}
	}
	// brighter streaks
	ctx.globalAlpha = 0.08;
	ctx.fillStyle = '#c8facc';
	for (let i = 0; i < 10; i++) {
		ctx.fillRect(Math.random()*S, Math.random()*S, 6 + Math.random()*24, 4);
	}
	ctx.globalAlpha = 1.0;
}

function drawDirtSide(ctx, S) {
	ctx.fillStyle = '#8d5a3a';
	ctx.fillRect(0, 0, S, S);
	// green lip for grass
	ctx.fillStyle = '#3c8b3f';
	ctx.fillRect(0, 0, S, Math.floor(S * 0.18));
	// noise speckles
	for (let y = 0; y < S; y += 6) {
		for (let x = 0; x < S; x += 6) {
			const d = 70 + Math.floor(Math.random() * 70);
			ctx.fillStyle = `rgb(${90 + Math.random()*70}, ${50 + Math.random()*40}, ${30 + Math.random()*20})`;
			ctx.fillRect(x, y, 6, 6);
		}
	}
}

function drawDirtBottom(ctx, S) {
	ctx.fillStyle = '#7a4a2a';
	ctx.fillRect(0, 0, S, S);
	for (let y = 0; y < S; y += 8) {
		for (let x = 0; x < S; x += 8) {
			ctx.fillStyle = `rgb(${90 + Math.random()*40}, ${45 + Math.random()*20}, ${25 + Math.random()*20})`;
			ctx.fillRect(x, y, 8, 8);
		}
	}
}

const texTop = makeCanvasTexture(drawGrassTop, 256);
const texSide = makeCanvasTexture(drawDirtSide, 256);
const texBottom = makeCanvasTexture(drawDirtBottom, 256);

const faceMaterials = [
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.9, metalness: 0.0, emissive: 0x000000, emissiveIntensity: 0.0 }), // +X right
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.9, metalness: 0.0, emissive: 0x000000, emissiveIntensity: 0.0 }), // -X left
	new THREE.MeshStandardMaterial({ map: texTop, roughness: 0.8, metalness: 0.0, emissive: 0x0a1e0a, emissiveIntensity: 0.0 }), // +Y top
	new THREE.MeshStandardMaterial({ map: texBottom, roughness: 0.95, metalness: 0.0, emissive: 0x120902, emissiveIntensity: 0.0 }), // -Y bottom
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.9, metalness: 0.0, emissive: 0x000000, emissiveIntensity: 0.0 }), // +Z front
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.9, metalness: 0.0, emissive: 0x000000, emissiveIntensity: 0.0 }), // -Z back
];

const cubeGeom = new THREE.BoxGeometry(2, 2, 2);
const cube = new THREE.Mesh(cubeGeom, faceMaterials);
scene.add(cube);

// Edge lines for crispness
const edges = new THREE.LineSegments(
	new THREE.EdgesGeometry(cubeGeom),
	new THREE.LineBasicMaterial({ color: 0x1a142f, linewidth: 1 })
);
scene.add(edges);

// Interaction planes (one per face) to capture clicks precisely
const interactionGroup = new THREE.Group();
scene.add(interactionGroup);

const faceDefs = [
	{ name: 'right',  normal: new THREE.Vector3( 1, 0, 0), rot: [0, Math.PI/2, 0], pos: [ 1.01, 0, 0], materialIndex: 0, page: 'east.html'  },
	{ name: 'left',   normal: new THREE.Vector3(-1, 0, 0), rot: [0, -Math.PI/2, 0], pos: [-1.01, 0, 0], materialIndex: 1, page: 'west.html'  },
	{ name: 'top',    normal: new THREE.Vector3( 0, 1, 0), rot: [-Math.PI/2, 0, 0], pos: [0,  1.01, 0], materialIndex: 2, page: 'top.html'   },
	{ name: 'bottom', normal: new THREE.Vector3( 0,-1, 0), rot: [ Math.PI/2, 0, 0], pos: [0, -1.01, 0], materialIndex: 3, page: 'bottom.html'},
	{ name: 'front',  normal: new THREE.Vector3( 0, 0, 1), rot: [0, 0, 0],           pos: [0, 0,  1.01], materialIndex: 4, page: 'south.html' },
	{ name: 'back',   normal: new THREE.Vector3( 0, 0,-1), rot: [0, Math.PI, 0],     pos: [0, 0, -1.01], materialIndex: 5, page: 'north.html' },
];

for (const f of faceDefs) {
	const plane = new THREE.Mesh(
		new THREE.PlaneGeometry(2.02, 2.02),
		new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthTest: false })
	);
	plane.position.set(...f.pos);
	plane.rotation.set(...f.rot);
	plane.userData = { type: 'face', name: f.name, materialIndex: f.materialIndex, page: f.page };
	interactionGroup.add(plane);
}

// Particles
const particlesParent = new THREE.Group();
scene.add(particlesParent);

function spawnParticles(theme, origin = new THREE.Vector3(), normal = new THREE.Vector3(0,1,0)) {
	const count = 120;
	const geom = new THREE.BufferGeometry();
	const positions = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);

	const colorMap = {
		leaf: new THREE.Color('#7bd389'),
		ember: new THREE.Color('#ff8844'),
		arcane: new THREE.Color('#8a5cff'),
		gold: new THREE.Color('#d4af37'),
	};
	const baseColor = colorMap[theme] || new THREE.Color('#ffffff');

	for (let i = 0; i < count; i++) {
		const r = Math.random() * 0.6 + 0.2;
		// distribute near plane: add some along normal
		const dir = new THREE.Vector3(
			(Math.random() * 2 - 1),
			(Math.random() * 2 - 1),
			(Math.random() * 2 - 1)
		).normalize().multiplyScalar(r * (0.6 + Math.random()*0.7));
		dir.add(normal.clone().multiplyScalar(Math.random() * 0.8 + 0.2));
		positions[i*3 + 0] = origin.x + dir.x;
		positions[i*3 + 1] = origin.y + dir.y;
		positions[i*3 + 2] = origin.z + dir.z;
		colors[i*3 + 0] = baseColor.r * (0.8 + Math.random()*0.4);
		colors[i*3 + 1] = baseColor.g * (0.8 + Math.random()*0.4);
		colors[i*3 + 2] = baseColor.b * (0.8 + Math.random()*0.4);
	}
	geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

	const material = new THREE.PointsMaterial({ size: 0.05, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 1.0, depthWrite: false });
	const points = new THREE.Points(geom, material);
	points.userData = { birth: performance.now(), life: 1200 + Math.random()*400 };
	particlesParent.add(points);

	gsap.to(material, { opacity: 0, duration: 1.2, ease: 'sine.in' });
	gsap.to(points.position, { x: origin.x + normal.x * 1.4, y: origin.y + normal.y * 1.4, z: origin.z + normal.z * 1.4, duration: 1.2, ease: 'sine.out' });
}

// Hover and click
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredFace = null;
let hovering = false;
let isTransitioning = false;

function setPointerFromEvent(ev) {
	const rect = renderer.domElement.getBoundingClientRect();
	const x = ( (ev.clientX - rect.left) / rect.width ) * 2 - 1;
	const y = - ( (ev.clientY - rect.top) / rect.height ) * 2 + 1;
	pointer.set(x, y);
}

function getOutwardNormal(object3d) {
	const q = object3d.getWorldQuaternion(new THREE.Quaternion());
	return new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
}

function updateHover(ev) {
	if (isTransitioning) return;
	setPointerFromEvent(ev);
	// subtle parallax tilt
	const tiltX = -pointer.y * 0.1;
	const tiltY = pointer.x * 0.1;
	gsap.to(cube.rotation, { x: Math.sin(t * 0.7) * 0.25 + tiltX, y: t + tiltY, duration: 0.2, overwrite: 'auto' });
	gsap.to(edges.rotation, { x: cube.rotation.x, y: cube.rotation.y, z: cube.rotation.z, duration: 0.2, overwrite: 'auto' });

	raycaster.setFromCamera(pointer, camera);
	const hits = raycaster.intersectObjects(interactionGroup.children, false);
	if (hits.length) {
		const hit = hits[0].object;
		if (hoveredFace !== hit) {
			// new hover target
			if (hoveredFace) clearHover();
			hoveredFace = hit;
			hovering = true;
			appEl.classList.add('has-hover');
			const mat = faceMaterials[hit.userData.materialIndex];
			gsap.to(mat, { emissiveIntensity: 0.35, duration: 0.25, ease: 'sine.out' });
			gsap.to(mat.emissive, { r: 0.25, g: 0.2, b: 0.35, duration: 0.25, ease: 'sine.out' });
			gsap.to(cube.scale, { x: 1.03, y: 1.03, z: 1.03, duration: 0.2, overwrite: true });
		}
	} else {
		clearHover();
	}
}

function clearHover() {
	if (hoveredFace) {
		const mat = faceMaterials[hoveredFace.userData.materialIndex];
		gsap.to(mat, { emissiveIntensity: 0.0, duration: 0.3 });
		gsap.to(mat.emissive, { r: 0.0, g: 0.0, b: 0.0, duration: 0.3 });
		gsap.to(cube.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.2 });
	}
	hoveredFace = null;
	hovering = false;
	appEl.classList.remove('has-hover');
}

function onClick(ev) {
	if (isTransitioning) return;
	setPointerFromEvent(ev);
	raycaster.setFromCamera(pointer, camera);
	const hits = raycaster.intersectObjects(interactionGroup.children, false);
	if (!hits.length) return;
	const hit = hits[0].object;
	const { name, materialIndex, page } = hit.userData;
	const wp = hit.getWorldPosition(new THREE.Vector3());
	const wd = getOutwardNormal(hit);
	triggerTransition(name, materialIndex, page, wp, wd);
}

// Transition logic per face
function triggerTransition(name, matIndex, page, worldPos, worldDir) {
	if (isTransitioning) return;
	isTransitioning = true;
	clearHover();
	gsap.killTweensOf(cube.rotation);
	renderer.domElement.style.pointerEvents = 'none';
	renderer.domElement.removeEventListener('pointermove', updateHover);
	renderer.domElement.removeEventListener('pointerleave', clearHover);
	renderer.domElement.removeEventListener('click', onClick);
	window.removeEventListener('keydown', keyboardHandler);

	// Particle burst themed per face
	const themes = {
		top: 'leaf',
		bottom: 'ember',
		front: 'gold',
		back: 'arcane',
		right: 'arcane',
		left: 'gold',
	};
	const sfx = {
		top: 'chime',
		bottom: 'ember',
		front: 'whoosh',
		back: 'portal',
		right: 'portal',
		left: 'whoosh',
	};

	spawnParticles(themes[name] || 'gold', worldPos, worldDir);
	playSfx(sfx[name] || 'chime');

	const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
	const bgGradByFace = {
		top: 'radial-gradient(120vh 120vh at 50% 50%, rgba(123,211,137,0.0), rgba(123,211,137,0.2) 40%, rgba(26,20,47,0.98))',
		bottom: 'radial-gradient(120vh 120vh at 50% 50%, rgba(255,136,68,0.0), rgba(255,136,68,0.28) 40%, rgba(10,7,14,0.98))',
		front: 'radial-gradient(120vh 120vh at 50% 50%, rgba(212,175,55,0.0), rgba(212,175,55,0.28) 40%, rgba(5,4,9,0.98))',
		back: 'radial-gradient(120vh 120vh at 50% 50%, rgba(138,92,246,0.0), rgba(138,92,246,0.28) 40%, rgba(5,4,9,0.98))',
		right: 'radial-gradient(120vh 120vh at 50% 50%, rgba(138,92,246,0.0), rgba(138,92,246,0.3) 40%, rgba(5,4,9,0.98))',
		left: 'radial-gradient(120vh 120vh at 50% 50%, rgba(212,175,55,0.0), rgba(212,175,55,0.3) 40%, rgba(5,4,9,0.98))',
	};

	overlay.style.opacity = '1';
	veilEl.style.background = bgGradByFace[name] || bgGradByFace.front;

	// Crest entrance and zoom out
	tl.set(crestEl, { textContent: name === 'top' ? '♘' : name === 'bottom' ? '♞' : name === 'front' ? '⚑' : name === 'back' ? '✦' : name === 'right' ? '◈' : '♛' });
	tl.fromTo(crestEl, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1.1, duration: 0.35, ease: 'back.out(2)' }, 0);
	tl.fromTo(runesEl, { opacity: 0 }, { opacity: 0.6, duration: 0.4 }, 0.08);
	tl.to(crestEl, { scale: 28, duration: 0.8, ease: 'expo.in' }, 0.22);
	tl.to(veilEl, { scale: 1.15, duration: 0.8, ease: 'expo.in' }, 0.22);

	// Cube push towards face
	tl.to(cube.rotation, { x: cube.rotation.x + (name==='top'? -0.6 : name==='bottom'? 0.6 : 0), y: cube.rotation.y + (name==='right'? -0.6 : name==='left'? 0.6 : name==='front'? 0 : Math.PI), z: cube.rotation.z, duration: 0.6, ease: 'expo.inOut' }, 0);
	tl.to(cube.position, { x: worldPos.x * 0.25, y: worldPos.y * 0.25, z: worldPos.z * 0.25, duration: 0.6, ease: 'expo.inOut' }, 0);

	// Navigate after flash
	tl.to(overlay, { opacity: 1, duration: 0.4 }, 0.2);
	tl.add(() => { window.location.assign(`./pages/${page}`); }, 0.9);
}

// Continuous rotation
let t = 0;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animate(now) {
	requestAnimationFrame(animate);
	const dt = now - (animate.last || now);
	animate.last = now;

	if (!prefersReduced) {
		t += dt * 0.0012;
		if (!hovering) {
			cube.rotation.y = t;
			cube.rotation.x = Math.sin(t * 0.7) * 0.25;
		}
		edges.rotation.copy(cube.rotation);
		edges.position.copy(cube.position);
	}

	// cleanup particles
	for (let i = particlesParent.children.length - 1; i >= 0; i--) {
		const p = particlesParent.children[i];
		const age = now - p.userData.birth;
		if (age > p.userData.life) {
			particlesParent.remove(p);
			p.geometry.dispose();
			p.material.dispose();
		}
	}

	renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// Events
window.addEventListener('resize', onResize);
function onResize() {
	const w = window.innerWidth;
	const h = window.innerHeight;
	renderer.setSize(w, h, false);
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
}
onResize();

renderer.domElement.addEventListener('pointermove', updateHover);
renderer.domElement.addEventListener('pointerleave', clearHover);
renderer.domElement.addEventListener('click', onClick);

function keyboardHandler(e) {
	const map = { ArrowUp: 'top', ArrowDown: 'bottom', ArrowRight: 'right', ArrowLeft: 'left', KeyW: 'front', KeyS: 'back' };
	const f = map[e.code];
	if (!f || isTransitioning) return;
	const def = faceDefs.find(d => d.name === f);
	if (!def) return;
	const plane = interactionGroup.children[faceDefs.indexOf(def)];
	const wp = plane.getWorldPosition(new THREE.Vector3());
	const wd = getOutwardNormal(plane);
	triggerTransition(def.name, def.materialIndex, def.page, wp, wd);
}

// Accessibility: keyboard navigate faces
window.addEventListener('keydown', keyboardHandler);