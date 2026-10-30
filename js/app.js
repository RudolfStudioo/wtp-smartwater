import { supabase } from './supabase-client.js';
import { formatRupiah, formatNumber } from './utils.js';
import { DEVICES, TARIF_PER_LITER, MIN_NOMINAL, MAX_NOMINAL, QUICK_NOMINALS } from './config.js';

// State
let currentDeviceId = 'WM-001';
let currentTab = 'dashboard';
let deviceData = null;
let nominalValue = 20000;
let isPaying = false;
let tarif = TARIF_PER_LITER;

// DOM Elements
const deviceSelect = document.getElementById('deviceSelect');
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const dashboardDevice = document.getElementById('dashboard-device');
const sisaLiterEl = document.getElementById('sisa-liter');
const dashboardError = document.getElementById('dashboard-error');
const dashboardInfo = document.getElementById('dashboard-info');
const quickNominalBtns = document.querySelectorAll('.quick-nominal');
const nominalInput = document.getElementById('nominal-input');
const nominalError = document.getElementById('nominal-error');
const literGotEl = document.getElementById('liter-got');
const payButton = document.getElementById('pay-button');
const paymentMessage = document.getElementById('payment-message');

// Monitoring elements
const statusOnlineEl = document.getElementById('status-online');
const statusPingEl = document.getElementById('status-ping');
const statusKatupEl = document.getElementById('status-katup');
const statusDebitEl = document.getElementById('status-debit');
const statusSisaEl = document.getElementById('status-sisa');

// Initialize
function init() {
  // Set initial values
  deviceSelect.value = currentDeviceId;
  nominalInput.value = formatRupiah(nominalValue);
  updateLiterDisplay();
  loadTarif();
  
  // Event Listeners
  deviceSelect.addEventListener('change', (e) => {
    currentDeviceId = e.target.value;
    dashboardDevice.textContent = currentDeviceId;
    loadDeviceData();
  });
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
  
  quickNominalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      nominalValue = parseInt(btn.dataset.nominal);
      nominalInput.value = formatRupiah(nominalValue);
      quickNominalBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateLiterDisplay();
    });
  });
  
  nominalInput.addEventListener('input', (e) => {
    nominalValue = parseInt(String(e.target.value).replace(/\D/g, ""), 10) || 0;
    quickNominalBtns.forEach(b => b.classList.remove('active'));
    updateLiterDisplay();
  });
  
  payButton.addEventListener('click', handlePayment);
  
  // Load initial data
  dashboardDevice.textContent = currentDeviceId;
  loadDeviceData();
  setInterval(loadDeviceData, 5000);
    if (supabase) {
    supabase
      .channel('devices-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' },
        (p) => { if (p.new && p.new.device_id === currentDeviceId) loadDeviceData(); })
      .subscribe((status) => console.log('realtime:', status));
  }
}

function switchTab(tab) {
  currentTab = tab;
  tabButtons.forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.add('active', 'border-sky-600', 'text-sky-700');
      btn.classList.remove('border-transparent', 'text-slate-500');
    } else {
      btn.classList.remove('active', 'border-sky-600', 'text-sky-700');
      btn.classList.add('border-transparent', 'text-slate-500');
    }
  });
  
  tabContents.forEach(content => {
    if (content.id === `tab-${tab}`) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  });
}

function updateLiterDisplay() {
  const valid = Number.isInteger(nominalValue) && nominalValue >= MIN_NOMINAL && nominalValue <= MAX_NOMINAL;
  if (valid) {
    const liter = nominalValue / tarif;
    literGotEl.textContent = `+${liter.toLocaleString('id-ID')} L`;
    nominalError.textContent = `Min ${formatRupiah(MIN_NOMINAL)}, maks ${formatRupiah(MAX_NOMINAL)}`;
    nominalError.classList.remove('text-red-600');
    nominalError.classList.add('text-slate-500');
    payButton.disabled = false;
  } else {
    literGotEl.textContent = '+0 L';
    nominalError.textContent = `Nominal harus bilangan bulat ${formatRupiah(MIN_NOMINAL)} – ${formatRupiah(MAX_NOMINAL)}`;
    nominalError.classList.remove('text-slate-500');
    nominalError.classList.add('text-red-600');
    payButton.disabled = true;
  }
}

async function loadDeviceData() {
  if (!supabase) {
    // Fallback or demo mode
    sisaLiterEl.textContent = '0';
    statusSisaEl.textContent = '0 L';
    statusOnlineEl.textContent = 'Offline';
    statusOnlineEl.classList.remove('text-emerald-600');
    statusOnlineEl.classList.add('text-red-600');
    statusPingEl.textContent = 'Belum tersambung ke database';
    statusKatupEl.textContent = 'Tertutup';
    statusKatupEl.classList.remove('text-sky-600');
    statusKatupEl.classList.add('text-slate-700');
    statusDebitEl.textContent = '0.00 L/mnt';
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('device_id', currentDeviceId)
      .maybeSingle();
    
    if (error) {
      dashboardError.textContent = 'Gagal membaca data: ' + error.message;
      dashboardError.classList.remove('hidden');
      dashboardInfo.classList.add('hidden');
      return;
    }
    
    if (data) {
      deviceData = data;
      dashboardError.classList.add('hidden');
      dashboardInfo.classList.remove('hidden');
      
      const sisa = Number(data.sisa_liter || 0);
      sisaLiterEl.textContent = formatNumber(sisa);
      statusSisaEl.textContent = formatNumber(sisa) + ' L';
      
      // Update monitoring
      if (data.last_ping) {
        const pingTime = new Date(data.last_ping);
        const now = new Date();
        const diffSeconds = Math.floor((now - pingTime) / 1000);
        const online = diffSeconds <= 15;
        
        if (online) {
          statusOnlineEl.textContent = 'Online';
          statusOnlineEl.classList.remove('text-red-600');
          statusOnlineEl.classList.add('text-emerald-600');
        } else {
          statusOnlineEl.textContent = 'Offline';
          statusOnlineEl.classList.remove('text-emerald-600');
          statusOnlineEl.classList.add('text-red-600');
        }
        
        if (diffSeconds < 60) {
          statusPingEl.textContent = 'Ping terakhir ' + diffSeconds + ' detik lalu';
        } else if (diffSeconds < 3600) {
          const min = Math.floor(diffSeconds / 60);
          statusPingEl.textContent = 'Ping terakhir ' + min + ' menit lalu';
        } else {
          const hours = Math.floor(diffSeconds / 3600);
          statusPingEl.textContent = 'Ping terakhir ' + hours + ' jam lalu';
        }
      } else {
        statusOnlineEl.textContent = 'Offline';
        statusOnlineEl.classList.remove('text-emerald-600');
        statusOnlineEl.classList.add('text-red-600');
        statusPingEl.textContent = 'Belum pernah ping';
      }
      
      if (data.status_katup) {
        statusKatupEl.textContent = 'Terbuka';
        statusKatupEl.classList.remove('text-slate-700');
        statusKatupEl.classList.add('text-sky-600');
      } else {
        statusKatupEl.textContent = 'Tertutup';
        statusKatupEl.classList.remove('text-sky-600');
        statusKatupEl.classList.add('text-slate-700');
      }
      
      statusDebitEl.textContent = Number(data.debit_realtime || 0).toFixed(2) + ' L/mnt';

      // Estimasi kuota habis = sisa / debit (hanya saat air mengalir)
      let est = document.getElementById('est-selesai');
      if (!est) {
        est = document.createElement('p');
        est.id = 'est-selesai';
        est.className = 'mt-1 text-sm text-white';
        dashboardInfo.parentNode.insertBefore(est, dashboardInfo.nextSibling);
      }
      const debitNow = Number(data.debit_realtime || 0);
      const pingAge = data.last_ping ? (Date.now() - new Date(data.last_ping).getTime()) / 1000 : Infinity;
      if (sisa <= 0) {
        est.textContent = 'Kuota habis';
      } else if (debitNow > 0.05 && pingAge < 60) {
        const menit = Math.round(sisa / debitNow);
        const jam = Math.floor(menit / 60);
        const durasi = jam ? jam + ' j ' + (menit % 60) + ' mnt' : menit + ' mnt';
        const jamHabis = new Date(Date.now() + menit * 60000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        est.textContent = 'Estimasi habis ±' + durasi + ' (sekitar ' + jamHabis + ')';
      } else {
        est.textContent = 'Estimasi habis: air tidak sedang mengalir';
      }
    }
  } catch (err) {
    dashboardError.textContent = 'Error: ' + err.message;
    dashboardError.classList.remove('hidden');
    dashboardInfo.classList.add('hidden');
  }
}

async function handlePayment() {
  const valid = Number.isInteger(nominalValue) && nominalValue >= MIN_NOMINAL && nominalValue <= MAX_NOMINAL;
  if (!valid) return;
  
  isPaying = true;
  payButton.disabled = true;
  payButton.textContent = 'Memproses…';
  paymentMessage.classList.add('hidden');
  
  try {
    const response = await fetch('/.netlify/functions/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: nominalValue,
        deviceId: currentDeviceId,
        userEmail: 'unknown'
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.token) {
      throw new Error(result.error || 'Gagal membuat transaksi (' + response.status + ')');
    }
    
    if (!window.snap) {
      throw new Error('snap.js belum termuat');
    }
    
    window.snap.pay(result.token, {
      onSuccess: () => confirmPayment(result.orderId),
      onPending: () => {
        showMessage('info', 'Menunggu pembayaran kamu selesai.');
        resetPaymentButton();
      },
      onError: () => {
        showMessage('err', 'Pembayaran gagal.');
        resetPaymentButton();
      },
      onClose: () => {
        resetPaymentButton();
      }
    });
  } catch (err) {
    showMessage('err', err.message);
    resetPaymentButton();
  }
}

async function confirmPayment(orderId) {
  try {
    const response = await fetch('/.netlify/functions/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    
    if (!response.ok) {
      throw new Error('Server belum bisa konfirmasi (' + response.status + ')');
    }
    
    showMessage('ok', 'Pembayaran dikonfirmasi server. Kuota akan ter-update sebentar lagi.');
  } catch (err) {
    showMessage('err', err.message);
  } finally {
    resetPaymentButton();
  }
}

function showMessage(type, message) {
  paymentMessage.classList.remove('hidden');
  paymentMessage.textContent = message;
  paymentMessage.className = 'mt-3 rounded-xl px-4 py-3 text-sm ';
  
  if (type === 'ok') {
    paymentMessage.classList.add('bg-emerald-50', 'text-emerald-800');
  } else if (type === 'err') {
    paymentMessage.classList.add('bg-red-50', 'text-red-800');
  } else if (type === 'info') {
    paymentMessage.classList.add('bg-sky-50', 'text-sky-800');
  }
}

function resetPaymentButton() {
  isPaying = false;
  payButton.disabled = false;
  payButton.textContent = 'Bayar & isi token';
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Tarif (Rp per liter) dibaca dari tabel app_settings; kalau gagal, pakai nilai di config.js
async function loadTarif() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'tarif_per_liter')
      .maybeSingle();
    const v = Number(data && data.value);
    if (!error && v > 0) {
      tarif = v;
      dashboardInfo.textContent = 'Tarif ' + formatRupiah(tarif) + ' per liter';
      updateLiterDisplay();
    }
  } catch (e) {}
}
