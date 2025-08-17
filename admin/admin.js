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

  const lock = document.getElementById('lock');
  const panel = document.getElementById('panel');
  const unlockForm = document.getElementById('unlockForm');
  const pinField = document.getElementById('pinField');
  const unlockError = document.getElementById('unlockError');

  function setUnlocked(u) {
    if (u) sessionStorage.setItem(SESSION_UNLOCK, '1'); else sessionStorage.removeItem(SESSION_UNLOCK);
    lock.style.display = u ? 'none' : '';
    panel.style.display = u ? '' : 'none';
  }

  function initUnlock() {
    unlockForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = (pinField.value || '').trim();
      if (val === PIN) { setUnlocked(true); initForm(); }
      else { unlockError.textContent = 'Incorrect PIN'; setTimeout(() => { if (unlockError.textContent) unlockError.textContent = ''; }, 1500); }
    });
    pinField.focus();
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
    eventEl.value = hasCustom ? new Date(cfg.eventISO).toISOString().slice(0,16) : '';
  }

  weeklyEl.addEventListener('change', () => { eventEl.disabled = weeklyEl.checked; if (weeklyEl.checked) eventEl.value = ''; });

  function showStatus(msg, ok=true) { statusEl.textContent = msg; statusEl.style.color = ok ? 'var(--muted)' : 'var(--danger)'; setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ''; }, 2000); }

  saveBtn.addEventListener('click', async () => {
    const cfg = {
      ip: (ipEl.value || '').trim() || defaultConfig.ip,
      discord: (discordEl.value || '').trim() || defaultConfig.discord,
      tagline: (taglineEl.value || '').trim() || defaultConfig.tagline,
      eventISO: weeklyEl.checked ? '' : new Date(eventEl.value).toISOString()
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
  else { setUnlocked(false); initUnlock(); }
})();