// Panel Admin: Loket, Monitoring, User, Tambah user. Hanya tampil untuk akun admin.
import { supabase } from './supabase-client.js';
import { formatRupiah, formatNumber } from './utils.js';

const ADMIN_EMAIL = 'admin@admin.com';
const SLOTS = Array.from({ length: 10 }, (_, i) => 'WM-' + String(i + 1).padStart(3, '0'));
const TABS = ['loket', 'monitoring', 'user', 'tambah'];
const CARD = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200';
const LABEL = 'mt-4 block text-xs font-medium uppercase tracking-wide text-slate-500';
const FIELD = 'mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400';
const TH = 'px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500';
const TD = 'px-3 py-2 text-sm';

const main = document.querySelector('main');
const nav = document.querySelector('header nav');
const root = document.createElement('div');
root.style.display = 'none';
root.innerHTML = `
<div class="mx-auto max-w-5xl px-4 py-6">
  <p id="ad-err" class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" style="display:none"></p>
  <div class="mb-6 flex gap-1 border-b border-slate-200">
    <button type="button" data-t="loket" class="ad-tab border-b-2 px-4 py-2 text-sm font-medium">Loket</button>
    <button type="button" data-t="monitoring" class="ad-tab border-b-2 px-4 py-2 text-sm font-medium">Monitoring</button>
    <button type="button" data-t="user" class="ad-tab border-b-2 px-4 py-2 text-sm font-medium">User</button>
    <button type="button" data-t="tambah" class="ad-tab border-b-2 px-4 py-2 text-sm font-medium">Tambah user</button>
  </div>

  <section id="ad-loket" class="${CARD} max-w-xl">
    <h2 class="text-lg font-semibold text-slate-800">Loket (bayar tunai)</h2>
    <label class="${LABEL}">Alat</label>
    <select id="ad-lk-dev" class="${FIELD}"><option value="WM-001">WM-001</option></select>
    <label class="${LABEL}">Nominal (Rp)</label>
    <input id="ad-lk-nom" type="text" inputmode="numeric" autocomplete="off" placeholder="Rp20.000" class="${FIELD}">
    <div class="mt-2 flex flex-wrap gap-2">
      <button type="button" data-n="20000" class="ad-q rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-slate-200 bg-white text-slate-700">Rp20.000</button>
      <button type="button" data-n="50000" class="ad-q rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-slate-200 bg-white text-slate-700">Rp50.000</button>
      <button type="button" data-n="100000" class="ad-q rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-slate-200 bg-white text-slate-700">Rp100.000</button>
    </div>
    <button id="ad-lk-btn" type="button" class="mt-4 w-full rounded-xl bg-sky-600 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">Catat &amp; isi kuota</button>
    <p id="ad-lk-msg" class="mt-3 rounded-xl px-4 py-3 text-sm" style="display:none"></p>
  </section>

  <section id="ad-monitoring">
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="${CARD} cursor-pointer" data-chart="liter"><p class="text-xs font-medium uppercase tracking-wide text-slate-500">Air keluar (total)</p><p id="ad-air" class="mt-2 text-2xl font-bold text-slate-800">...</p><p class="mt-1 text-xs text-slate-400">Grafik 14 hari</p></div>
      <div class="${CARD} cursor-pointer" data-chart="rupiah"><p class="text-xs font-medium uppercase tracking-wide text-slate-500">Pendapatan</p><p id="ad-uang" class="mt-2 text-2xl font-bold text-slate-800">...</p><p class="mt-1 text-xs text-slate-400">Grafik 14 hari</p></div>
      <div class="${CARD}"><p class="text-xs font-medium uppercase tracking-wide text-slate-500">Alat online</p><p id="ad-online" class="mt-2 text-2xl font-bold text-slate-800">...</p></div>
    </div>
    <h2 class="mt-6 text-lg font-semibold text-slate-800">Status alat</h2>
    <div id="ad-dev-rows" class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5"></div>
  </section>

  <section id="ad-user">
    <div class="${CARD} overflow-x-auto">
      <h2 class="text-lg font-semibold text-slate-800">Pemakaian air per user</h2>
      <p class="mt-1 text-xs text-slate-500">Klik baris untuk melihat histori.</p>
      <table class="mt-3 w-full">
        <thead><tr><th class="${TH}">User / alat</th><th class="${TH}">Total air keluar</th><th class="${TH}">Sisa kuota</th></tr></thead>
        <tbody id="ad-user-rows"></tbody>
      </table>
    </div>
    <div id="ad-hist" class="${CARD} mt-4" style="display:none"></div>
  </section>

  <section id="ad-tambah" class="max-w-xl">
    <div class="${CARD}">
      <h2 class="text-lg font-semibold text-slate-800">Tambah user (langganan baru)</h2>
      <p class="mt-1 text-xs text-slate-500">Alat diambil otomatis dari slot kosong pertama.</p>
      <label class="${LABEL}">Nama</label>
      <input id="ad-tb-nama" type="text" maxlength="40" autocomplete="off" placeholder="Nama pelanggan" class="${FIELD}">
      <label class="${LABEL}">Password (minimal 8 karakter)</label>
      <input id="ad-tb-pw" type="text" maxlength="72" autocomplete="off" placeholder="Password sementara" class="${FIELD}">
      <button id="ad-tb-btn" type="button" class="mt-4 w-full rounded-xl bg-sky-600 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">Buat akun</button>
      <p id="ad-tb-msg" class="mt-3 rounded-xl px-4 py-3 text-sm" style="display:none"></p>
    </div>
    <div id="ad-tb-pending" class="mt-4"></div>
  </section>
</div>
<div id="ad-pop" class="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200" style="display:none;position:fixed;z-index:50"></div>`;
if (main) main.after(root);
const $ = (sel) => root.querySelector(sel);

let token = null;
let isAdmin = false;
let timer = null;
let data = null;
let chartCache = null;
let chartAt = 0;
let popFor = null;

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = (t) => new Date(t).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
const isOnline = (d) => !!(d && d.last_ping && Date.now() - new Date(d.last_ping) <= 15000);
const isPending = (d) => !!(d && d.user_email && !d.last_ping);

async function api(path, opts = {}) {
  const res = await fetch('/.netlify/functions/' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Gagal (' + res.status + ')');
  return json;
}

function showTab(t) {
  hidePop();
  TABS.forEach((k) => { $('#ad-' + k).style.display = k === t ? '' : 'none'; });
  root.querySelectorAll('.ad-tab').forEach((b) => {
    const on = b.dataset.t === t;
    b.classList.toggle('border-sky-600', on);
    b.classList.toggle('text-sky-700', on);
    b.classList.toggle('border-transparent', !on);
    b.classList.toggle('text-slate-500', !on);
  });
}

function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? h + ' j ' + m + ' m' : m ? m + ' m ' + (s % 60) + ' d' : s + ' d';
}

// ---------- Popup grafik 14 hari ----------
async function loadChart() {
  if (chartCache && Date.now() - chartAt < 60000) return chartCache;
  const off = -new Date().getTimezoneOffset();
  const r = await api('admin-chart?days=14&offset=' + off);
  chartCache = r.days || [];
  chartAt = Date.now();
  return chartCache;
}

function chartHtml(days, key) {
  const liter = key === 'liter';
  const fmt = (v) => (liter ? formatNumber(Math.round(v * 100) / 100) + ' L' : formatRupiah(v));
  const vals = days.map((d) => Number(d[key]) || 0);
  const max = Math.max(0, ...vals);
  const total = vals.reduce((a, b) => a + b, 0);
  const today = vals.length ? vals[vals.length - 1] : 0;
  const W = 320, H = 130, pb = 20, pt = 8, pl = 4;
  const bw = (W - pl * 2) / (days.length || 1);
  const bars = days.map((d, i) => {
    const h = max ? Math.max(vals[i] ? 2 : 0, (vals[i] / max) * (H - pb - pt)) : 0;
    const x = pl + i * bw + 2;
    const last = i === days.length - 1;
    const tgl = String(d.tanggal);
    const label = i % 2 === (days.length - 1) % 2
      ? '<text x="' + (x + (bw - 4) / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="9" fill="#64748b">' + tgl.slice(8, 10) + '/' + tgl.slice(5, 7) + '</text>'
      : '';
    return '<rect x="' + x + '" y="' + (H - pb - h) + '" width="' + (bw - 4) + '" height="' + h + '" rx="2" data-info="' + esc(String(d.tanggal).slice(8, 10) + '/' + String(d.tanggal).slice(5, 7) + ': ' + fmt(vals[i])) + '" style="cursor:pointer" fill="' + (last ? '#0284c7' : '#7dd3fc') + '"/>' + label;
  }).join('');
  return '<p class="text-sm font-semibold text-slate-800">' + (liter ? 'Air keluar' : 'Pendapatan') + ' (14 hari terakhir)</p>'
    + '<p class="mt-1 text-xs text-slate-500">Total ' + esc(fmt(total)) + ' · Hari ini ' + esc(fmt(today)) + '</p>'
    + '<svg viewBox="0 0 ' + W + ' ' + H + '" class="mt-2 w-full" role="img">' + bars
    + '<line x1="0" y1="' + (H - pb) + '" x2="' + W + '" y2="' + (H - pb) + '" stroke="#e2e8f0"/></svg>'
    + '<p class="text-xs text-slate-400">Tertinggi per hari: ' + esc(fmt(max)) + '</p>';
}

function placePop(card) {
  const pop = $('#ad-pop');
  const r = card.getBoundingClientRect();
  const w = Math.min(360, window.innerWidth - 16);
  pop.style.width = w + 'px';
  const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
  pop.style.left = left + 'px';
  const h = pop.offsetHeight;
  let top = r.bottom + 8;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
  pop.style.top = top + 'px';
}

async function showPop(card) {
  const pop = $('#ad-pop');
  popFor = card;
  pop.style.display = '';
  pop.innerHTML = '<p class="text-sm text-slate-500">Memuat grafik…</p>';
  placePop(card);
  try {
    const days = await loadChart();
    if (popFor !== card) return;
    pop.innerHTML = chartHtml(days, card.dataset.chart);
    placePop(card);
  } catch (e) {
    if (popFor === card) pop.innerHTML = '<p class="text-sm text-red-600">' + esc(e.message) + '</p>';
  }
}

function hidePop() {
  popFor = null;
  const pop = $('#ad-pop');
  if (pop) pop.style.display = 'none';
}

function renderMonitoring() {
  const s = data.summary || {};
  const byId = Object.fromEntries((data.devices || []).map((d) => [d.device_id, d]));
  $('#ad-air').textContent = formatNumber(s.total_liter || 0) + ' L';
  $('#ad-uang').textContent = formatRupiah(s.pendapatan || 0);
  $('#ad-online').textContent = SLOTS.filter((id) => isOnline(byId[id])).length + ' / ' + SLOTS.length;
  $('#ad-dev-rows').innerHTML = SLOTS.map((id) => {
    const d = byId[id];
    const on = isOnline(d);
    const menunggu = isPending(d);
    const buka = on && [true, 1, 't', 'true', '1'].includes(d.status_katup);
    const dur = buka && d.katup_sejak ? fmtDur(Date.now() - new Date(d.katup_sejak)) : '-';
    const nama = d && d.nama ? d.nama : '-';
    const kosong = !(d && d.user_email) && !on;
    const status = kosong ? 'Belum terdaftar' : (menunggu ? 'Menunggu alat online' : (on ? 'Online' : 'Offline'));
    const warna = kosong ? 'text-slate-400' : (menunggu ? 'text-amber-600' : (on ? 'text-emerald-600' : 'text-red-600'));
    const ring = kosong ? 'ring-1 ring-slate-300' : (menunggu ? 'ring-1 ring-amber-400' : (on ? 'ring-1 ring-emerald-500' : 'ring-1 ring-red-400'));
    return `<div class="rounded-2xl bg-white p-5 shadow-sm ${ring} min-w-0">
      <div class="flex items-center justify-between gap-2">
        <p class="font-semibold text-slate-800">${id}</p>
        <span class="truncate text-xs font-medium ${warna}">${status}</span>
      </div>
      <p class="truncate text-sm text-slate-600" title="${esc(nama)}">${esc(nama)}</p>
      <p class="mt-2 text-xs text-slate-500">${on ? (buka ? 'Katup terbuka (uptime)' : 'Katup tertutup') : 'Katup: -'}</p>
      <p class="text-sm font-medium text-slate-800">${buka ? dur : '-'}</p>
      <p class="mt-2 text-xs text-slate-500">Debit</p>
      <p class="text-sm font-medium text-slate-800">${on ? Number(d.debit_realtime || 0).toFixed(2) + ' L/mnt' : '-'}</p>
      <p class="mt-2 text-xs text-slate-500">Sisa kuota</p>
      <p class="text-sm font-medium text-slate-800">${d ? formatNumber(d.sisa_liter) + ' L' : '-'}</p>
    </div>`;
  }).join('');
}

function renderPending() {
  const list = (data.devices || []).filter(isPending)
    .sort((a, b) => a.device_id.localeCompare(b.device_id));
  const box = $('#ad-tb-pending');
  if (!list.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<h3 class="text-sm font-semibold text-slate-700">Menunggu alat online</h3>
    <div class="mt-2 grid grid-cols-2 gap-3">${list.map((d) => `
      <div class="min-w-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-amber-400">
        <p class="font-semibold text-slate-800">${esc(d.device_id)}</p>
        <p class="truncate text-sm text-slate-600" title="${esc(d.nama || '-')}">${esc(d.nama || '-')}</p>
        <p class="mt-1 text-xs font-medium text-amber-600">Belum pernah online</p>
      </div>`).join('')}</div>`;
}

function renderUsers() {
  const byId = Object.fromEntries((data.devices || []).map((d) => [d.device_id, d]));
  const used = Object.fromEntries(((data.summary && data.summary.per_device) || []).map((r) => [r.device_id, r.liter]));
  const ids = SLOTS.filter((id) => byId[id] && (byId[id].user_email || byId[id].nama) || used[id]);
  $('#ad-user-rows').innerHTML = ids.map((id) => `
    <tr class="ad-user-row cursor-pointer border-t border-slate-200 hover:bg-slate-50" data-id="${id}">
      <td class="${TD} font-medium">${esc(byId[id] && byId[id].nama ? byId[id].nama : 'Customer ' + id)} <span class="text-xs font-normal text-slate-500">${id}</span></td>
      <td class="${TD}">${formatNumber(used[id] || 0)} L</td>
      <td class="${TD}">${byId[id] ? formatNumber(byId[id].sisa_liter) + ' L' : '-'}</td></tr>`).join('')
    || `<tr><td class="${TD} text-slate-500" colspan="3">Belum ada data.</td></tr>`;
}

function edMsg(type, text) {
  const el = $('#ad-ed-msg');
  if (!el) return;
  el.style.display = '';
  el.textContent = text;
  el.className = 'mt-3 rounded-xl px-4 py-3 text-sm ' + (type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800');
}

async function openHistory(id) {
  const box = $('#ad-hist');
  box.style.display = '';
  box.innerHTML = '<p class="text-sm text-slate-500">Memuat histori…</p>';
  try {
    const h = await api('admin-data?history=' + encodeURIComponent(id));
    const dv = ((data && data.devices) || []).find((x) => x.device_id === id) || {};
    const punya = !!dv.user_email;
    const usage = h.usage.map((r) => `<tr class="border-t border-slate-200"><td class="${TD}">${fmtTime(r.waktu)}</td><td class="${TD}">${r.liter.toFixed(3)} L</td></tr>`).join('')
      || `<tr><td class="${TD} text-slate-500" colspan="2">Belum ada pemakaian tercatat.</td></tr>`;
    const trx = h.transactions.map((r) => `<tr class="border-t border-slate-200"><td class="${TD}">${fmtTime(r.created_at)}</td><td class="${TD}">${formatRupiah(r.nominal)}</td><td class="${TD}">${formatNumber(r.liter_diperoleh)} L</td><td class="${TD}">${esc(r.metode_pembayaran)}</td></tr>`).join('')
      || `<tr><td class="${TD} text-slate-500" colspan="4">Belum ada transaksi.</td></tr>`;
    box.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-semibold text-slate-800">Histori ${esc(id)}</h2>
        <div class="flex gap-4 text-sm">
          ${punya ? '<button type="button" id="ad-ed-open" class="font-medium text-sky-700">Edit</button><button type="button" id="ad-ed-del" class="font-medium text-red-600">Hapus</button>' : ''}
          <button type="button" id="ad-hist-close" class="text-slate-500">Tutup</button>
        </div>
      </div>
      <div id="ad-ed-box" class="mt-4 rounded-xl bg-slate-50 p-4" style="display:none">
        <label class="block text-xs font-medium uppercase tracking-wide text-slate-500">Nama</label>
        <input id="ad-ed-nama" type="text" maxlength="40" autocomplete="off" value="${esc(dv.nama || '')}" class="${FIELD}">
        <label class="${LABEL}">Password baru (kosongkan jika tidak diganti)</label>
        <input id="ad-ed-pw" type="text" maxlength="72" autocomplete="off" placeholder="Minimal 8 karakter" class="${FIELD}">
        <button id="ad-ed-save" type="button" class="mt-4 w-full rounded-xl bg-sky-600 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">Simpan</button>
        <p id="ad-ed-msg" class="mt-3 rounded-xl px-4 py-3 text-sm" style="display:none"></p>
      </div>
      <h3 class="mt-4 text-sm font-semibold text-slate-700">Pemakaian air (per menit)</h3>
      <div class="overflow-x-auto"><table class="mt-1 w-full"><thead><tr><th class="${TH}">Waktu</th><th class="${TH}">Air keluar</th></tr></thead><tbody>${usage}</tbody></table></div>
      <h3 class="mt-4 text-sm font-semibold text-slate-700">Pengisian kuota</h3>
      <div class="overflow-x-auto"><table class="mt-1 w-full"><thead><tr><th class="${TH}">Waktu</th><th class="${TH}">Nominal</th><th class="${TH}">Kuota</th><th class="${TH}">Metode</th></tr></thead><tbody>${trx}</tbody></table></div>`;

    $('#ad-hist-close').addEventListener('click', () => { box.style.display = 'none'; });

    if (punya) {
      $('#ad-ed-open').addEventListener('click', () => {
        const eb = $('#ad-ed-box');
        eb.style.display = eb.style.display === 'none' ? '' : 'none';
      });

      $('#ad-ed-save').addEventListener('click', async () => {
        const btn = $('#ad-ed-save');
        const nama = $('#ad-ed-nama').value.trim();
        const password = $('#ad-ed-pw').value;
        if (!nama) { edMsg('err', 'Nama tidak boleh kosong.'); return; }
        if (password && password.length < 8) { edMsg('err', 'Password minimal 8 karakter.'); return; }
        btn.disabled = true;
        btn.textContent = 'Menyimpan…';
        try {
          await api('admin-edit-user', { method: 'POST', body: JSON.stringify({ deviceId: id, nama, password }) });
          edMsg('ok', 'Tersimpan.' + (password ? ' Password sudah diganti.' : ''));
          $('#ad-ed-pw').value = '';
          refresh();
        } catch (e) {
          edMsg('err', e.message);
        } finally {
          btn.disabled = false;
          btn.textContent = 'Simpan';
        }
      });

      $('#ad-ed-del').addEventListener('click', async () => {
        const label = (dv.nama || id) + ' (' + id + ')';
        if (!window.confirm('Hapus akun ' + label + '?\n\nAkun login dihapus permanen dan sisa kuota jadi 0. Riwayat transaksi tetap disimpan.')) return;
        try {
          await api('admin-delete-user', { method: 'POST', body: JSON.stringify({ deviceId: id }) });
          box.style.display = 'none';
          refresh();
        } catch (e) {
          edMsg('err', e.message);
          $('#ad-ed-box').style.display = '';
        }
      });
    }
  } catch (e) {
    box.innerHTML = '<p class="text-sm text-red-600">' + esc(e.message) + '</p>';
  }
}

async function refresh() {
  if (!isAdmin || !token) return;
  const err = $('#ad-err');
  try {
    data = await api('admin-data');
    err.style.display = 'none';
    renderMonitoring();
    renderUsers();
    renderPending();
  } catch (e) {
    err.textContent = e.message;
    err.style.display = '';
  }
}

function msg(type, text) {
  const el = $('#ad-lk-msg');
  el.style.display = '';
  el.textContent = text;
  el.className = 'mt-3 rounded-xl px-4 py-3 text-sm ' + (type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800');
}

// ---------- Event ----------
root.querySelectorAll('.ad-tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.t)));
$('#ad-user-rows').addEventListener('click', (e) => {
  const tr = e.target.closest('.ad-user-row');
  if (tr) openHistory(tr.dataset.id);
});

// popup grafik: desktop = arahkan kursor, layar sentuh = ketuk
let hideT = null;
const schedHide = () => { clearTimeout(hideT); hideT = setTimeout(hidePop, 250); };
const popEl = $('#ad-pop');
if (popEl) { popEl.addEventListener('mouseenter', () => clearTimeout(hideT)); popEl.addEventListener('mouseleave', schedHide); }
if (popEl) {
  const showTip = (e) => {
    const r = e.target.closest && e.target.closest('rect[data-info]');
    if (!r) return;
    let t = popEl.querySelector('#ad-tip');
    if (!t) {
      t = document.createElement('p');
      t.id = 'ad-tip';
      t.className = 'mt-1 text-sm font-semibold text-sky-700';
      const svg = popEl.querySelector('svg');
      if (svg) svg.parentNode.insertBefore(t, svg.nextSibling);
    }
    t.textContent = r.dataset.info;
  };
  popEl.addEventListener('mouseover', showTip);
  popEl.addEventListener('click', (e) => { e.stopPropagation(); showTip(e); });
}
const canHover = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);
root.querySelectorAll('[data-chart]').forEach((card) => {
  if (canHover) {
    card.addEventListener('mouseenter', () => { clearTimeout(hideT); showPop(card); });
    card.addEventListener('mouseleave', schedHide);
  } else {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      if (popFor === card) hidePop(); else showPop(card);
    });
  }
});
document.addEventListener('click', (e) => {
  if (popFor && !e.target.closest('[data-chart]')) hidePop();
});
window.addEventListener('scroll', hidePop, { passive: true });

const nomInput = $('#ad-lk-nom');
const setNominal = (n) => { nomInput.value = n ? 'Rp' + Number(n).toLocaleString('id-ID') : ''; };
nomInput.addEventListener('input', () => setNominal(nomInput.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')));
root.querySelectorAll('.ad-q').forEach((b) => b.addEventListener('click', () => setNominal(b.dataset.n)));

$('#ad-lk-btn').addEventListener('click', async () => {
  const btn = $('#ad-lk-btn');
  const deviceId = $('#ad-lk-dev').value;
  const nominal = parseInt(nomInput.value.replace(/\D/g, ''), 10) || 0;
  if (nominal < 10000 || nominal > 1000000) { msg('err', 'Nominal harus Rp10.000 sampai Rp1.000.000.'); return; }
  if (!window.confirm('Catat pembayaran tunai ' + formatRupiah(nominal) + ' untuk ' + deviceId + '?')) return;
  btn.disabled = true;
  btn.textContent = 'Memproses…';
  try {
    const r = await api('admin-loket', { method: 'POST', body: JSON.stringify({ deviceId, amount: nominal }) });
    msg('ok', 'Tercatat. Sisa kuota ' + deviceId + ': ' + formatNumber(r.sisaLiter) + ' L.');
    setNominal('');
    chartCache = null;
    refresh();
  } catch (e) {
    msg('err', e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Catat & isi kuota';
  }
});

// ---------- Tambah user ----------
function tbMsg(type, html) {
  const el = $('#ad-tb-msg');
  el.style.display = '';
  el.innerHTML = html;
  el.className = 'mt-3 rounded-xl px-4 py-3 text-sm ' + (type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800');
}

$('#ad-tb-btn').addEventListener('click', async () => {
  const btn = $('#ad-tb-btn');
  const nama = $('#ad-tb-nama').value.trim();
  const password = $('#ad-tb-pw').value;
  if (!nama) { tbMsg('err', 'Nama wajib diisi.'); return; }
  if (password.length < 8) { tbMsg('err', 'Password minimal 8 karakter.'); return; }
  btn.disabled = true;
  btn.textContent = 'Memproses…';
  try {
    const r = await api('admin-create-user', { method: 'POST', body: JSON.stringify({ nama, password }) });
    tbMsg('ok', 'Akun dibuat untuk <b>' + esc(r.nama) + '</b>.<br>Alat: <b>' + esc(r.deviceId) + '</b><br>Email login: <b>' + esc(r.email) + '</b><br>Password: <b>' + esc(password) + '</b><br><span class="text-xs">Catat sekarang dan berikan ke pelanggan; password tidak ditampilkan lagi setelah halaman ini ditutup.</span>');
    $('#ad-tb-nama').value = '';
    $('#ad-tb-pw').value = '';
    refresh();
  } catch (e) {
    tbMsg('err', esc(e.message));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buat akun';
  }
});

// ---------- Ikuti sesi login ----------
function setAdmin(admin) {
  if (admin === isAdmin) return;
  isAdmin = admin;
  if (main) main.style.display = admin ? 'none' : '';
  if (nav) nav.style.display = admin ? 'none' : '';
  root.style.display = admin ? '' : 'none';
  clearInterval(timer);
  hidePop();
  if (admin) {
    showTab('monitoring');
    refresh();
    timer = setInterval(refresh, 10000);
  }
}
function applySession(session) {
  token = session && session.access_token ? session.access_token : null;
  const email = session && session.user && session.user.email ? session.user.email.toLowerCase() : '';
  setAdmin(email === ADMIN_EMAIL);
}

if (supabase) {
  // callback sengaja sinkron (jangan panggil supabase di dalamnya)
  supabase.auth.onAuthStateChange((_e, session) => applySession(session));
  supabase.auth.getSession().then(({ data: d }) => applySession(d.session));
}
