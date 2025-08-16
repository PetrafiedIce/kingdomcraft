// Spinnable Minecraft-style cube (90° FOV, crisp 16x16 texels, hover glow + bounce)
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

// Perspective camera (feels non-orthographic)
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 3.6);
camera.lookAt(0, 0, 0);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambient);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(3, 5, 2);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x7a88ff, 0.3);
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

// Interaction planes (one per face)
const interactionGroup = new THREE.Group();
scene.add(interactionGroup);
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
glowSprite.scale.set(1.4, 1.4, 1.4);
scene.add(glowSprite);

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
let timeMs = 0;

function setPointerFromEvent(ev) {
	const rect = renderer.domElement.getBoundingClientRect();
	const x = ( (ev.clientX - rect.left) / rect.width ) * 2 - 1;
	const y = - ( (ev.clientY - rect.top) / rect.height ) * 2 + 1;
	pointer.set(x, y);
}

// Drag rotation with inertia
canvas.addEventListener('pointerdown', (e) => {
	isDragging = true;
	lastX = e.clientX;
	lastY = e.clientY;
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
		// Hover detection
		raycaster.setFromCamera(pointer, camera);
		const hits = raycaster.intersectObjects(interactionGroup.children, false);
		if (hits.length) {
			const hit = hits[0].object;
			if (hoveredPlane !== hit) {
				clearHover();
				hoveredPlane = hit;
				const { materialIndex } = hit.userData.def;
				const mat = faceMaterials[materialIndex];
				mat.emissive.setHex(0x7a5cff);
				mat.emissiveIntensity = 0.35;
				targetScale = 1.07; // bounce target
				glowTarget = 0.8;
				canvas.style.cursor = 'pointer';
			}
			// Keep glow on face center
			const pos = hit.getWorldPosition(new THREE.Vector3());
			glowSprite.position.copy(pos);
		} else {
			clearHover();
		}
	}
});

function clearHover() {
	if (hoveredPlane) {
		const { materialIndex } = hoveredPlane.userData.def;
		const mat = faceMaterials[materialIndex];
		mat.emissiveIntensity = 0.0;
		mat.emissive.setHex(0x000000);
	}
	hoveredPlane = null;
	targetScale = 1.0;
	glowTarget = 0.0;
	canvas.style.cursor = 'default';
}

// Inverted wheel dolly zoom (scroll up -> zoom in)
function setCameraZ(z) {
	camera.position.z = Math.max(1.2, Math.min(12, z));
}
window.addEventListener('wheel', (e) => {
	e.preventDefault();
	// Inverted direction vs previous behavior
	const factor = Math.exp(e.deltaY * 0.001);
	setCameraZ(camera.position.z * factor);
	camera.lookAt(0, 0, 0);
}, { passive: false });

function animate(now = 0) {
	requestAnimationFrame(animate);
	timeMs = now;
	// Springy scale
	const stiffness = 0.18; // spring k
	const damping = 0.78;   // damping factor
	const force = (targetScale - currentScale) * stiffness;
	scaleVel = scaleVel * damping + force;
	currentScale += scaleVel;
	cube.scale.set(currentScale, currentScale, currentScale);
	// Glow opacity + pulse scale
	glowOpacity += (glowTarget - glowOpacity) * 0.12;
	glowMat.opacity = glowOpacity * (0.85 + 0.15 * Math.sin(now * 0.012));
	const pulse = 1.2 + 0.15 * Math.sin(now * 0.01);
	glowSprite.scale.set(pulse, pulse, pulse);
	// Inertia
	if (!isDragging) {
		cube.rotation.y += (velY *= 0.95);
		cube.rotation.x += (velX *= 0.95);
	}
	// Sync edges
	edges.position.copy(cube.position);
	edges.rotation.copy(cube.rotation);
	// Slight edge color shimmer for style
	const huePulse = (Math.sin(now * 0.0015) * 0.5 + 0.5) * 0.2 + 0.6; // 0.6..0.8
	const r = 180 + Math.floor(huePulse * 40);
	const g = 140 + Math.floor(huePulse * 20);
	const b = 60 + Math.floor(huePulse * 10);
	edges.material.color.setRGB(r/255, g/255, b/255);
	// Render
	camera.lookAt(0, 0, 0);
	renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// Resize handling
window.addEventListener('resize', () => {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
});