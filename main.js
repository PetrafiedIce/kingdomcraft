// Minimal spinnable Minecraft-style cube
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('scene');

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);

// Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0.6, 0.5, 3.6);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambient);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
keyLight.position.set(3, 5, 2);
scene.add(keyLight);

// Procedural Minecraft-like textures
function makeCanvasTexture(drawFn, size = 256) {
	const c = document.createElement('canvas');
	c.width = c.height = size;
	const ctx = c.getContext('2d');
	drawFn(ctx, size);
	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1;
	tex.magFilter = THREE.NearestFilter;
	tex.minFilter = THREE.LinearMipMapLinearFilter;
	tex.generateMipmaps = true;
	return tex;
}

function drawGrassTop(ctx, S) {
	ctx.fillStyle = '#4caf50';
	ctx.fillRect(0, 0, S, S);
	for (let y = 0; y < S; y += 8) {
		for (let x = 0; x < S; x += 8) {
			const g = 70 + Math.floor(Math.random() * 70);
			ctx.fillStyle = `rgb(${Math.floor(40 + Math.random()*30)}, ${g}, ${Math.floor(40 + Math.random()*30)})`;
			ctx.fillRect(x, y, 8, 8);
		}
	}
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
	ctx.fillStyle = '#3c8b3f';
	ctx.fillRect(0, 0, S, Math.floor(S * 0.18));
	for (let y = 0; y < S; y += 6) {
		for (let x = 0; x < S; x += 6) {
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
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.85, metalness: 0.0 }), // +X
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.85, metalness: 0.0 }), // -X
	new THREE.MeshStandardMaterial({ map: texTop, roughness: 0.80, metalness: 0.0 }),  // +Y
	new THREE.MeshStandardMaterial({ map: texBottom, roughness: 0.90, metalness: 0.0 }), // -Y
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.85, metalness: 0.0 }), // +Z
	new THREE.MeshStandardMaterial({ map: texSide, roughness: 0.85, metalness: 0.0 })  // -Z
];

const cube = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), faceMaterials);
scene.add(cube);

// Simple pointer-driven rotation with inertia
let isDragging = false;
let lastX = 0, lastY = 0;
let velX = 0, velY = 0;

canvas.addEventListener('pointerdown', (e) => {
	isDragging = true;
	lastX = e.clientX;
	lastY = e.clientY;
	canvas.setPointerCapture(e.pointerId);
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

function animate() {
	requestAnimationFrame(animate);
	if (!isDragging) {
		cube.rotation.y += (velY *= 0.95);
		cube.rotation.x += (velX *= 0.95);
	}
	renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
});