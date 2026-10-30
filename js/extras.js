// Tambahan UI: tema, menu hamburger, login + ganti akun cepat (Supabase Auth), format Rupiah, animasi kecil
import { supabase } from './supabase-client.js';

const THEME_KEY = 'theme';
const SAVED_KEY = 'uw-saved-sessions';

// Email di sini HARUS sama dengan user yang dibuat di Supabase (Authentication -> Users)
const ACCOUNTS = {
  'wm-001': { label: 'WM-001', role: 'Customer', email: 'rama@gmail.com', device: 'WM-001' },
  admin: { label: 'Admin', role: 'Petugas WTP', email: 'admin@admin.com', device: null },
};

const root = document.documentElement;
const $ = (sel, scope = document) => scope.querySelector(sel);

function make(tag, attrs = {}, html = '') {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  node.innerHTML = html;
  return node;
}

let current = null; // kunci akun yang sedang masuk
let ready = false; // true setelah status sesi pertama diketahui
let namaCust = ''; // nama customer dari tabel devices

async function loadNama() {
  namaCust = '';
  const dev = current ? ACCOUNTS[current].device : null;
  if (dev && supabase) {
    try {
      const { data } = await supabase
        .from('devices')
        .select('nama')
        .eq('device_id', dev)
        .maybeSingle();
      namaCust = (data && data.nama) || '';
    } catch (e) {}
  }
  render();
}

// ---------- Akun tersimpan (untuk ganti akun cepat) ----------
function loadSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) || '{}');
    const out = {};
    Object.keys(raw).forEach((k) => {
      if (ACCOUNTS[k] && raw[k] && raw[k].access_token && raw[k].refresh_token) out[k] = raw[k];
    });
    return out;
  } catch { return {}; }
}
function writeSaved(obj) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(obj)); } catch {}
}
function rememberSession(key, session) {
  if (!key || !session || !session.access_token || !session.refresh_token) return;
  const saved = loadSaved();
  saved[key] = { access_token: session.access_token, refresh_token: session.refresh_token };
  writeSaved(saved);
}
function forgetSession(key) {
  const saved = loadSaved();
  delete saved[key];
  writeSaved(saved);
}
function renderSaved(container) {
  const saved = loadSaved();
  const keys = Object.keys(ACCOUNTS).filter((k) => saved[k]);
  container.innerHTML = keys.map((k) => `
    <button type="button" class="uw-account uw-quick" data-key="${k}">
      <span><strong>${ACCOUNTS[k].label}</strong><br><small>${ACCOUNTS[k].role}</small></span>
      ${k === current ? '<span class="uw-chip">Aktif</span>' : ''}
    </button>`).join('');
  return keys.length;
}

// ---------- Tema ----------
const isDark = () => root.classList.contains('dark');
function setTheme(dark) {
  root.classList.toggle('dark', dark);
  try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch {}
  render();
}

// ---------- Toast ----------
let toastTimer;
function toast(msg) {
  let t = $('#uw-toast');
  if (!t) {
    t = make('div', { id: 'uw-toast', class: 'uw-toast', role: 'status' });
    document.body.append(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- Header: dropdown perangkat disembunyikan, hamburger ditambah ----------
const select = document.getElementById('deviceSelect');
if (select) select.hidden = true; // tetap ada di DOM karena app.js memakainya
const holder = select ? select.parentElement : null;
const userBox = make('div', { class: 'uw-user' }, '<span class="uw-user-name"></span><span class="uw-user-role"></span>');
const wrap = make('div', { class: 'uw-menu-wrap' }, `
  <button type="button" id="uw-menu-btn" class="uw-menu-btn" aria-label="Menu" aria-haspopup="true" aria-expanded="false">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
  </button>
  <div id="uw-menu" class="uw-menu" role="menu" hidden>
    <div class="uw-menu-head"><span class="uw-user-name" id="uw-menu-name"></span><span class="uw-user-role" id="uw-menu-role"></span></div>
    <button type="button" class="uw-item" id="uw-theme" role="menuitem"><span>Mode tampilan</span><span class="uw-chip" id="uw-theme-chip"></span></button>
    <button type="button" class="uw-item" id="uw-switch" role="menuitem"><span>Ganti akun</span></button>
    <button type="button" class="uw-item danger" id="uw-logout" role="menuitem"><span>Keluar akun</span></button>
  </div>`);
if (holder) {
  holder.prepend(userBox);
  holder.append(wrap);
}

function toggleMenu(open) {
  const menu = $('#uw-menu');
  const btn = $('#uw-menu-btn');
  if (!menu || !btn) return;
  const willOpen = open ?? menu.hidden;
  menu.hidden = !willOpen;
  btn.setAttribute('aria-expanded', String(willOpen));
}

// ---------- Form login (dipakai untuk layar masuk dan "Tambah akun") ----------
const accountRows = Object.entries(ACCOUNTS).map(([key, a]) => `
  <label class="uw-account"><input type="radio" name="uw-acc" value="${key}"><span><strong>${a.label}</strong><br><small>${a.role}</small></span></label>`).join('');

const login = make('div', { class: 'uw-backdrop uw-top', hidden: '' }, `
  <form class="uw-dialog" id="uw-login-form" autocomplete="off">
    <h3 id="uw-login-title">Masuk</h3>
    <div class="uw-field" id="uw-saved-wrap" hidden>
      <span class="uw-label">Masuk cepat</span>
      <div class="uw-accounts" id="uw-login-saved"></div>
    </div>
    <div class="uw-field">
      <span class="uw-label">Akun</span>
      <div class="uw-accounts">${accountRows}</div>
    </div>
    <div class="uw-field">
      <label class="uw-label" for="uw-pass">Password</label>
      <input id="uw-pass" class="uw-input" type="password" autocomplete="current-password">
    </div>
    <p class="uw-error" id="uw-error" role="alert"></p>
    <div class="uw-actions">
      <button type="button" class="uw-btn ghost" id="uw-cancel">Batal</button>
      <button type="submit" class="uw-btn primary" id="uw-submit">Masuk</button>
    </div>
  </form>`);

// ---------- Popup ganti akun (pindah cepat) ----------
const switcher = make('div', { class: 'uw-backdrop uw-top', hidden: '' }, `
  <div class="uw-dialog" role="dialog" aria-labelledby="uw-sw-title">
    <h3 id="uw-sw-title">Ganti akun</h3>
    <p class="uw-note">Ketuk akun untuk pindah langsung.</p>
    <div class="uw-accounts" id="uw-sw-list" style="margin-top:.75rem"></div>
    <button type="button" class="uw-account uw-quick uw-add" id="uw-add">
      <span><strong>+ Tambah akun</strong><br><small>Masuk dengan password</small></span>
    </button>
    <div class="uw-actions"><button type="button" class="uw-btn ghost" id="uw-sw-close">Tutup</button></div>
  </div>`);

document.body.append(login, switcher);

function showLogin(preselect) {
  toggleMenu(false);
  switcher.hidden = true;
  const forced = !current; // belum masuk: form tidak bisa ditutup
  const fresh = login.hidden;
  const form = $('#uw-login-form');
  if (fresh) {
    form.reset();
    $('#uw-error').textContent = supabase ? '' : 'Supabase belum tersambung, login belum bisa dipakai.';
  }
  login.classList.toggle('uw-lock', forced);
  $('#uw-cancel').hidden = forced;
  $('#uw-login-title').textContent = forced ? 'Masuk' : 'Tambah akun';
  $('#uw-saved-wrap').hidden = renderSaved($('#uw-login-saved')) === 0;

  let pick = preselect;
  if (!pick && fresh) pick = Object.keys(ACCOUNTS).find((k) => k !== current) || 'wm-001';
  const radio = pick ? $(`input[name="uw-acc"][value="${pick}"]`, form) : null;
  if (radio) radio.checked = true;

  login.hidden = false;
  if (fresh || preselect) $('#uw-pass').focus();
}
function closeLogin() {
  login.hidden = true;
  login.classList.remove('uw-lock');
}
function openSwitcher() {
  toggleMenu(false);
  renderSaved($('#uw-sw-list'));
  switcher.hidden = false;
}

async function quickSwitch(key) {
  const saved = loadSaved()[key];
  if (!supabase || !saved) return;
  if (key === current) { switcher.hidden = true; return; }
  const { error } = await supabase.auth.setSession(saved);
  if (error) {
    forgetSession(key);
    switcher.hidden = true;
    showLogin(key);
    $('#uw-error').textContent = 'Sesi akun ini sudah habis. Masuk lagi dengan password.';
    return;
  }
  switcher.hidden = true;
  toast('Pindah ke ' + ACCOUNTS[key].label);
}

// ---------- Tampilan mengikuti sesi ----------
function syncDevice() {
  if (!select) return;
  const dev = current ? ACCOUNTS[current].device : null;
  if (dev && select.value !== dev) {
    select.value = dev;
    select.dispatchEvent(new Event('change'));
  }
}

function render() {
  const acc = current ? ACCOUNTS[current] : null;
  $('.uw-user-name', userBox).textContent = acc ? acc.label : 'Belum masuk';
  $('.uw-user-role', userBox).textContent = acc ? (namaCust || acc.role) : '';
  $('#uw-menu-name').textContent = acc ? acc.label : 'Belum masuk';
  $('#uw-menu-role').textContent = acc ? (namaCust || acc.role) : '';
  $('#uw-theme-chip').textContent = isDark() ? 'Gelap' : 'Terang';

  const forced = ready && !acc && !!supabase;
  if (forced) {
    if (login.hidden || !login.classList.contains('uw-lock')) showLogin();
  } else if (login.classList.contains('uw-lock')) {
    closeLogin();
  }
}

function applySession(session) {
  const email = session && session.user && session.user.email ? session.user.email.toLowerCase() : '';
  current = Object.keys(ACCOUNTS).find((k) => ACCOUNTS[k].email.toLowerCase() === email) || null;
  if (current && session) rememberSession(current, session);
  ready = true;
  render();
  syncDevice();
  loadNama();
}

if (supabase) {
  // callback ini sengaja sinkron (jangan panggil supabase di dalamnya)
  supabase.auth.onAuthStateChange((_event, session) => applySession(session));
  supabase.auth.getSession().then(({ data }) => applySession(data.session));
} else {
  ready = true;
  toast('Login belum aktif: Supabase belum tersambung');
}

// ---------- Event ----------
$('#uw-menu-btn')?.addEventListener('click', () => toggleMenu());
$('#uw-theme')?.addEventListener('click', () => setTheme(!isDark()));
$('#uw-switch')?.addEventListener('click', openSwitcher);
$('#uw-logout')?.addEventListener('click', async () => {
  toggleMenu(false);
  if (current) forgetSession(current);
  if (supabase) await supabase.auth.signOut({ scope: 'local' });
  toast('Kamu sudah keluar');
});
$('#uw-add').addEventListener('click', () => showLogin());
$('#uw-sw-close').addEventListener('click', () => { switcher.hidden = true; });
$('#uw-cancel').addEventListener('click', closeLogin);

[$('#uw-sw-list'), $('#uw-login-saved')].forEach((box) => {
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('.uw-quick[data-key]');
    if (btn) quickSwitch(btn.dataset.key);
  });
});

$('#uw-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#uw-error');
  const chosen = $('input[name="uw-acc"]:checked', e.currentTarget);
  const password = $('#uw-pass').value;
  if (!chosen) { err.textContent = 'Pilih akun dulu.'; return; }
  if (!password) { err.textContent = 'Password wajib diisi.'; return; }
  if (!supabase) { err.textContent = 'Supabase belum tersambung, login belum bisa dipakai.'; return; }

  const btn = $('#uw-submit');
  btn.disabled = true;
  btn.textContent = 'Memeriksa…';
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ACCOUNTS[chosen.value].email,
    password,
  });
  btn.disabled = false;
  btn.textContent = 'Masuk';

  if (error) {
    err.textContent = 'Password salah, atau akun belum dibuat di Supabase.';
    return;
  }
  if (data && data.session) rememberSession(chosen.value, data.session);
  closeLogin();
  toast('Masuk sebagai ' + ACCOUNTS[chosen.value].label);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.uw-menu-wrap')) toggleMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!switcher.hidden) switcher.hidden = true;
  else if (!login.hidden && current) closeLogin();
  else toggleMenu(false);
});

// ---------- Format Rupiah di input nominal ----------
const nominalInput = document.getElementById('nominal-input');
if (nominalInput) {
  nominalInput.addEventListener('input', () => {
    const caret = nominalInput.selectionStart ?? nominalInput.value.length;
    const digitsBefore = nominalInput.value.slice(0, caret).replace(/\D/g, '').length;
    const digits = nominalInput.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    nominalInput.value = digits ? 'Rp' + Number(digits).toLocaleString('id-ID') : '';

    let pos = 0;
    let seen = 0;
    while (pos < nominalInput.value.length && seen < digitsBefore) {
      if (/\d/.test(nominalInput.value[pos])) seen++;
      pos++;
    }
    if (digitsBefore === 0 && nominalInput.value.startsWith('Rp')) pos = 2;
    nominalInput.setSelectionRange(pos, pos);
  });
}

// ---------- Angka "berdenyut" saat berubah ----------
function bumpOnChange(node) {
  if (!node) return;
  let last = node.textContent;
  new MutationObserver(() => {
    if (node.textContent === last) return;
    last = node.textContent;
    node.classList.remove('uw-bump');
    void node.offsetWidth;
    node.classList.add('uw-bump');
  }).observe(node, { childList: true, characterData: true, subtree: true });
}
['sisa-liter', 'liter-got', 'status-sisa', 'status-debit'].forEach((id) => bumpOnChange(document.getElementById(id)));

render();
