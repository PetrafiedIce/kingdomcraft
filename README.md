# KingdomCraft Interactive Block

An interactive 3D Minecraft-style grass block built with Three.js and GSAP. Each face is clickable and triggers a themed animated transition (particles + sound) to a different page. Designed for desktop and mobile.

## Quick start

- Open `index.html` in a modern browser, or serve the folder:

```bash
python3 -m http.server 5173
# open http://localhost:5173
```

## Customize routes

Edit the `routes` object in `main.js` to map faces to your site's pages:

```js
const routes = {
  top: '/kingdom/castle',
  front: '/kingdom/join',
  left: '/kingdom/rules',
  right: '/kingdom/shop',
  back: '/kingdom/forums',
  bottom: '/kingdom/map'
};
```

## Assets and theming

- Textures are loaded from public GitHub CDN links in `main.js`. For production, host textures locally and update the URLs.
- Sounds are from Pixabay CDNs via Howler. Replace with your own assets by changing `initSounds()` in `main.js`.
- Overlay transition colors per-face are defined in `themeForFace()`.

## Integration

- Drop the three files (`index.html`, `styles.css`, `main.js`) into your site. If embedding into an existing page, copy the `#kc-canvas-container` and related CSS, load the same script tags, and call the script after the container exists.

## Notes

- Uses pointer events for both mouse and touch.
- Limits device pixel ratio to keep performance reasonable on mobile.
- Particle effects are CPU-side for simplicity; for heavier uses consider custom shaders and instancing.