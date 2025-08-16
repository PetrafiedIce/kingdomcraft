// Spinnable Minecraft-style cube (90° FOV, crisp 16x16 texels, rich hover + bounce + particles)
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

// Particles
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
				// Reset previous
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
				targetScale = 1.08; // bounce target
				glowTarget = 0.9;
				canvas.style.cursor = 'pointer';
				// Particles burst on enter
				const worldPos = hit.getWorldPosition(new THREE.Vector3());
				const worldNormal = normal.clone().applyQuaternion(cube.getWorldQuaternion(new THREE.Quaternion()));
				const colorByFace = [0xcaa36a, 0xcaa36a, 0x6bdc6e, 0xa0643c, 0xcaa36a, 0xcaa36a];
				spawnParticles(colorByFace[materialIndex], worldPos, worldNormal, 80, 0.7);
			}
			// Keep glow on current face center
			const pos = hit.getWorldPosition(new THREE.Vector3());
			glowSprite.position.copy(pos);
			glowSprite.lookAt(camera.position);
		} else {
			// Clear
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

// Click bounce + sparkles
canvas.addEventListener('click', () => {
	if (!hoveredPlane) return;
	// Stronger spring impulse
	scaleVel -= 0.15;
	// Angular impulse
	velY += 0.06;
	velX -= 0.04;
	// Sparkle burst
	const { materialIndex, normal } = hoveredPlane.userData.def;
	const worldPos = hoveredPlane.getWorldPosition(new THREE.Vector3());
	const worldNormal = normal.clone().applyQuaternion(cube.getWorldQuaternion(new THREE.Quaternion()));
	const colorByFace = [0xffd37a, 0xffd37a, 0x88ff88, 0xd08a55, 0xffd37a, 0xffd37a];
	spawnParticles(colorByFace[materialIndex], worldPos, worldNormal, 120, 1.0);
});

// Inverted wheel dolly zoom (scroll up -> zoom in) with inertia
function setCameraZ(z) {
	targetCameraZ = Math.max(1.2, Math.min(12, z));
}
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

// Idle bob for flair
let bobPhase = 0;

function animate(now = 0) {
	requestAnimationFrame(animate);
	// Smooth zoom to target
	camera.position.z += (targetCameraZ - camera.position.z) * 0.15;
	camera.lookAt(0, 0, 0);
	// Springy scale
	const stiffness = 0.18; // spring k
	const damping = 0.78;   // damping factor
	const force = (targetScale - currentScale) * stiffness;
	scaleVel = scaleVel * damping + force;
	currentScale += scaleVel;
	cube.scale.set(currentScale, currentScale, currentScale);
	// Edges follow all transforms including scale
	edges.position.copy(cube.position);
	edges.rotation.copy(cube.rotation);
	edges.scale.copy(cube.scale);
	// Glow opacity + pulse scale
	glowOpacity += (glowTarget - glowOpacity) * 0.12;
	glowMat.opacity = glowOpacity * (0.85 + 0.15 * Math.sin(now * 0.012));
	const pulse = 1.15 + 0.15 * Math.sin(now * 0.01);
	glowSprite.scale.set(pulse, pulse, pulse);
	// Inertia
	if (!isDragging) {
		cube.rotation.y += (velY *= 0.95);
		cube.rotation.x += (velX *= 0.95);
	}
	// Idle bob
	bobPhase += 0.0025;
	cube.position.y = Math.sin(bobPhase) * 0.02;
	edges.position.y = cube.position.y;
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
			// light upward drift
			velocities.array[j*3 + 1] += 0.0006;
		}
		positions.needsUpdate = true;
		p.material.opacity = 1.0 - t;
	}
	// Subtle edge color shimmer
	const huePulse = (Math.sin(now * 0.0015) * 0.5 + 0.5) * 0.2 + 0.6; // 0.6..0.8
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