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

  function loadConfig() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? { ...defaultConfig, ...JSON.parse(raw) } : { ...defaultConfig }; }
    catch(_) { return { ...defaultConfig }; }
  }
  function saveConfig(cfg) { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }

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
    lock.addEventListener('click', (e) => {
      const key = e.target.getAttribute('data-key');
      const action = e.target.getAttribute('data-action');
      if (!key && !action) return;
      if (key) {
        if (buff.length < 4) buff += key;
        render();
      } else if (action === 'clear') { clear(''); }
      else if (action === 'enter') {
        if (buff === PIN) { setUnlocked(true); initForm(); }
        else { clear('Incorrect PIN'); }
      }
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

  function initForm() {
    const cfg = loadConfig();
    ipEl.value = cfg.ip || '';
    discordEl.value = cfg.discord || '';
    taglineEl.value = cfg.tagline || '';
    const hasCustom = !!(cfg.eventISO && cfg.eventISO.trim());
    weeklyEl.checked = !hasCustom;
    eventEl.disabled = weeklyEl.checked;
    eventEl.value = hasCustom ? toLocalDatetimeValue(cfg.eventISO) : '';
  }

  weeklyEl.addEventListener('change', () => { eventEl.disabled = weeklyEl.checked; if (weeklyEl.checked) eventEl.value = ''; });

  function showStatus(msg) { statusEl.textContent = msg; setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ''; }, 1600); }

  saveBtn.addEventListener('click', () => {
    const cfg = loadConfig();
    cfg.ip = ipEl.value.trim() || defaultConfig.ip;
    cfg.discord = discordEl.value.trim() || defaultConfig.discord;
    cfg.tagline = taglineEl.value.trim() || defaultConfig.tagline;
    cfg.eventISO = weeklyEl.checked ? '' : fromLocalDatetimeValue(eventEl.value.trim());
    saveConfig(cfg);
    showStatus('Saved');
  });

  resetBtn.addEventListener('click', () => {
    if (!confirm('Reset all settings to defaults?')) return;
    saveConfig(defaultConfig);
    initForm();
    showStatus('Reset');
  });

  // boot
  if (sessionStorage.getItem(SESSION_UNLOCK) === '1') { setUnlocked(true); initForm(); }
  else { setUnlocked(false); initKeypad(); }
})();