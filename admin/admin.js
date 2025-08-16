(function(){
  const STORAGE_KEY = 'kc:config';
  const SESSION_UNLOCK = 'kc:adminUnlocked';
  const PIN = '1111';
  const defaultConfig = {
    ip: 'play.kingdomcraft.net',
    discord: 'https://discord.gg/kingdomcraft',
    tagline: 'Forge Your Legacy in Battle!',
    eventISO: ''
  };

  async function readServerConfig() {
    try { const res = await fetch('/api/config', { cache: 'no-store' }); if (!res.ok) throw new Error('bad'); return await res.json(); } catch(_) { return defaultConfig; }
  }
  async function writeServerConfig(cfg) {
    const res = await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
    if (!res.ok) throw new Error('Save failed');
    const data = await res.json();
    return data.config || cfg;
  }

  function loadLocal() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...defaultConfig, ...JSON.parse(raw) } : { ...defaultConfig }; }
    catch(_) { return { ...defaultConfig }; }
  }
  function saveLocal(cfg) { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }

  function toLocalDatetimeValue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.valueOf())) return '';
    const pad = n => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }
  function fromLocalDatetimeValue(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.valueOf())) return '';
    return d.toISOString();
  }

  const lock = document.getElementById('lock');
  const panel = document.getElementById('panel');
  const pinDisplay = document.getElementById('pinDisplay');
  const pinError = document.getElementById('pinError');

  function setUnlocked(u) {
    if (u) sessionStorage.setItem(SESSION_UNLOCK, '1'); else sessionStorage.removeItem(SESSION_UNLOCK);
    lock.style.display = u ? 'none' : '';
    panel.style.display = u ? '' : 'none';
  }

  function initKeypad() {
    let buff = '';
    function render() { pinDisplay.textContent = buff.padEnd(4, '_').replace(/\d/g, '•'); }
    function clear(msg) { buff = ''; render(); if (msg) { pinError.textContent = msg; setTimeout(() => pinError.textContent = '', 1400); } }

    // Attach per-button handlers
    lock.querySelectorAll('.keypad .btn').forEach(btn => {
      const key = btn.getAttribute('data-key');
      const action = btn.getAttribute('data-action');
      btn.addEventListener('click', () => {
        if (key) {
          if (buff.length < 4) buff += key;
          render();
          return;
        }
        if (action === 'clear') { clear(''); return; }
        if (action === 'enter') {
          if (buff === PIN) { setUnlocked(true); initForm(); }
          else { clear('Incorrect PIN'); }
        }
      });
    });

    render();
  }

  // Settings form
  const ipEl = document.getElementById('ip');
  const discordEl = document.getElementById('discord');
  const taglineEl = document.getElementById('tagline');
  const eventEl = document.getElementById('eventDate');
  const weeklyEl = document.getElementById('weekly');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const statusEl = document.getElementById('status');

  async function initForm() {
    const cfg = await readServerConfig().catch(() => loadLocal());
    ipEl.value = cfg.ip || '';
    discordEl.value = cfg.discord || '';
    taglineEl.value = cfg.tagline || '';
    const hasCustom = !!(cfg.eventISO && cfg.eventISO.trim());
    weeklyEl.checked = !hasCustom;
    eventEl.disabled = weeklyEl.checked;
    eventEl.value = hasCustom ? toLocalDatetimeValue(cfg.eventISO) : '';
  }

  weeklyEl.addEventListener('change', () => { eventEl.disabled = weeklyEl.checked; if (weeklyEl.checked) eventEl.value = ''; });

  function showStatus(msg, ok=true) { statusEl.textContent = msg; statusEl.style.color = ok ? 'var(--muted)' : 'var(--danger)'; setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ''; }, 2000); }

  saveBtn.addEventListener('click', async () => {
    const cfg = {
      ip: (ipEl.value || '').trim() || defaultConfig.ip,
      discord: (discordEl.value || '').trim() || defaultConfig.discord,
      tagline: (taglineEl.value || '').trim() || defaultConfig.tagline,
      eventISO: weeklyEl.checked ? '' : fromLocalDatetimeValue((eventEl.value || '').trim())
    };
    try {
      const saved = await writeServerConfig(cfg);
      saveLocal(saved);
      showStatus('Saved');
    } catch (e) {
      showStatus('Save failed', false);
    }
  });

  resetBtn.addEventListener('click', async () => {
    if (!confirm('Reset all settings to defaults?')) return;
    try {
      const saved = await writeServerConfig(defaultConfig);
      saveLocal(saved);
      await initForm();
      showStatus('Reset');
    } catch (_) { showStatus('Reset failed', false); }
  });

  if (sessionStorage.getItem(SESSION_UNLOCK) === '1') { setUnlocked(true); initForm(); }
  else { setUnlocked(false); initKeypad(); }
})();