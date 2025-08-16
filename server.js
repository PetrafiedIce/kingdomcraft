const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const CONFIG_PATH = path.join(__dirname, 'config.json');
const DEFAULT_CONFIG = {
	ip: 'play.kingdomcraft.net',
	discord: 'https://discord.gg/kingdomcraft',
	tagline: 'Forge Your Legacy in Battle!',
	eventISO: ''
};

function readConfig() {
	try {
		if (!fs.existsSync(CONFIG_PATH)) {
			fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
			return { ...DEFAULT_CONFIG };
		}
		const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
		const parsed = JSON.parse(raw);
		return { ...DEFAULT_CONFIG, ...parsed };
	} catch (e) {
		return { ...DEFAULT_CONFIG };
	}
}

function writeConfig(cfg) {
	const merged = { ...DEFAULT_CONFIG, ...cfg };
	fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
	return merged;
}

app.use(express.json());

// Simple request logger
app.use((req, _res, next) => {
	next();
});

// SSE clients
/** @type {Set<import('http').ServerResponse>} */
const sseClients = new Set();

function broadcast(event, data) {
	const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
	for (const res of sseClients) {
		try { res.write(payload); } catch (_) { /* ignore */ }
	}
}

app.get('/api/stream', (req, res) => {
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.flushHeaders();

	sseClients.add(res);
	res.write(`event: hello\n` + `data: ${JSON.stringify({ ok: true })}\n\n`);

	req.on('close', () => {
		sseClients.delete(res);
	});
});

app.get('/api/config', (req, res) => {
	res.setHeader('Cache-Control', 'no-store');
	return res.json(readConfig());
});

app.put('/api/config', (req, res) => {
	const { ip, discord, tagline, eventISO } = req.body || {};
	const cfg = writeConfig({ ip, discord, tagline, eventISO });
	broadcast('config', cfg);
	return res.json({ ok: true, config: cfg });
});

// Serve static site
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
	console.log(`KingdomCraft server running on http://localhost:${PORT}`);
});