// Minimal spinnable Minecraft-style cube (perspective 90° FOV, 16x16 texels per face)
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

// Generate true 16x16 texel textures (pixel-art) for each face
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

function drawGrassTop(ctx, S) {
	// Base green
	ctx.fillStyle = '#4caf50';
	ctx.fillRect(0, 0, S, S);
	// Subtle 16x16 dithering within the 16 texels
	for (let y = 0; y < S; y++) {
		for (let x = 0; x < S; x++) {
			const g = 90 + Math.floor(Math.random() * 70);
			const r = 30 + Math.floor(Math.random() * 30);
			const b = 30 + Math.floor(Math.random() * 30);
			if ((x + y) % 3 === 0) {
				ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
				ctx.fillRect(x, y, 1, 1);
			}
		}
	}
}

function drawDirtSide(ctx, S) {
	// Dirt
	ctx.fillStyle = '#8d5a3a';
	ctx.fillRect(0, 0, S, S);
	// Grass lip (3px tall)
	ctx.fillStyle = '#3c8b3f';
	ctx.fillRect(0, 0, S, 3);
	// Speckled dirt pixels
	for (let y = 3; y < S; y++) {
		for (let x = 0; x < S; x++) {
			if (Math.random() < 0.3) {
				const rr = 90 + Math.floor(Math.random() * 60);
				const gg = 50 + Math.floor(Math.random() * 30);
				const bb = 30 + Math.floor(Math.random() * 20);
				ctx.fillStyle = `rgb(${rr}, ${gg}, ${bb})`;
				ctx.fillRect(x, y, 1, 1);
			}
		}
	}
}

function drawDirtBottom(ctx, S) {
	ctx.fillStyle = '#7a4a2a';
	ctx.fillRect(0, 0, S, S);
	for (let y = 0; y < S; y++) {
		for (let x = 0; x < S; x++) {
			if (Math.random() < 0.25) {
				const rr = 90 + Math.floor(Math.random() * 40);
				const gg = 45 + Math.floor(Math.random() * 20);
				const bb = 25 + Math.floor(Math.random() * 20);
				ctx.fillStyle = `rgb(${rr}, ${gg}, ${bb})`;
				ctx.fillRect(x, y, 1, 1);
			}
		}
	}
}

const texTop = makeCanvasTexture(drawGrassTop, 16);
const texSide = makeCanvasTexture(drawDirtSide, 16);
const texBottom = makeCanvasTexture(drawDirtBottom, 16);

const faceMaterials = [
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.85, metalness: 0.0 }), // +X
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.85, metalness: 0.0 }), // -X
	new THREE.MeshStandardMaterial({ map: texTop, roughness: 0.80, metalness: 0.0 }),  // +Y
	new THREE.MeshStandardMaterial({ map: texBottom, roughness: 0.90, metalness: 0.0 }), // -Y
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.85, metalness: 0.0 }), // +Z
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.85, metalness: 0.0 })  // -Z
];

// Reasonable world size; textures remain 16x16 texels per face
const cube = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), faceMaterials);
cube.position.set(0, 0, 0);
scene.add(cube);

// Drag rotation with inertia
let isDragging = false;
let lastX = 0, lastY = 0;
let velX = 0, velY = 0;

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
	if (!isDragging) return;
	const dx = e.clientX - lastX;
	const dy = e.clientY - lastY;
	lastX = e.clientX;
	lastY = e.clientY;
	velX = dy * 0.005;
	velY = dx * 0.005;
	cube.rotation.x += velX;
	cube.rotation.y += velY;
});

// Wheel dolly zoom (move camera along Z)
function setCameraZ(z) {
	camera.position.z = Math.max(1.2, Math.min(12, z));
}

window.addEventListener('wheel', (e) => {
	e.preventDefault();
	const factor = Math.exp(-e.deltaY * 0.001);
	setCameraZ(camera.position.z * factor);
	camera.lookAt(0, 0, 0);
}, { passive: false });

function animate() {
	requestAnimationFrame(animate);
	if (!isDragging) {
		cube.rotation.y += (velY *= 0.95);
		cube.rotation.x += (velX *= 0.95);
	}
	camera.lookAt(0, 0, 0);
	renderer.render(scene, camera);
}
animate();

// Resize handling
window.addEventListener('resize', () => {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
});