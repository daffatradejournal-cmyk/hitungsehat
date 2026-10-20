// Hitung Sehat — Main Application Controller
// Orchestrates UI views, camera capture, store updates, and the Decision Gate.

import { Store } from './store.js';
import { VisionEngine } from './vision-engine.js';

const store = new Store();
const vision = new VisionEngine();

// Current Transient State in the Scanner
let activeTransientScan = null;
let activeCameraStream = null;
let currentPortion = 1.0;
let currentBrothOil = 'standar';
let currentMealType = 'Makan Siang';

// Toast Utility
function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// 1. Render Greeting Header
function renderGreeting() {
  const profile = store.profile;
  const totals = store.getTodayTotals();
  const headlineEl = document.getElementById('greeting-headline');
  const sublineEl = document.getElementById('greeting-subline');

  const hour = new Date().getHours();
  let timeGreeting = 'Pagi';
  let mealSuggestion = 'makan siang';
  if (hour >= 11 && hour < 15) {
    timeGreeting = 'Siang';
    mealSuggestion = 'camilan sore atau makan malam';
  } else if (hour >= 15 && hour < 18) {
    timeGreeting = 'Sore';
    mealSuggestion = 'makan malam';
  } else if (hour >= 18 || hour < 4) {
    timeGreeting = 'Malam';
    mealSuggestion = 'istirahat malam';
  }

  const firstName = profile.name.split(' ')[0] || 'Pengguna';
  
  if (totals.remainingCalories > 0) {
    headlineEl.textContent = `${timeGreeting}, ${firstName}. Kuota tersisa ${totals.remainingCalories.toLocaleString('id-ID')} kkal untuk ${mealSuggestion}.`;
  } else {
    headlineEl.textContent = `${timeGreeting}, ${firstName}. Target kalori harian telah terpenuhi dengan baik.`;
  }

  const dateFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  sublineEl.innerHTML = `
    <span class="date-label">${dateFormatted}</span>
    <span class="dot-separator">&middot;</span>
    <span>${totals.acceptedCount} kali makan tercatat</span>
    <span class="dot-separator">&middot;</span>
    <span>Target harian: ${totals.targetCalories.toLocaleString('id-ID')} kkal</span>
  `;
}

// 2. Render Daily Progress Ring & Macro Bars
function renderDailyProgress() {
  const totals = store.getTodayTotals();

  // Progress Ring Calculation (Radius 54 -> Perimeter ~339.29)
  const circleVal = document.getElementById('ring-progress-circle');
  const centerVal = document.getElementById('ring-consumed-val');
  const remainingBanner = document.getElementById('ring-remaining-desc');
  const kpiConsumed = document.getElementById('kpi-consumed');
  const kpiRemaining = document.getElementById('kpi-remaining');
  const kpiCount = document.getElementById('kpi-accepted-count');

  kpiConsumed.textContent = `${totals.totalCalories.toLocaleString('id-ID')} kkal`;
  kpiRemaining.textContent = `${totals.remainingCalories.toLocaleString('id-ID')} kkal`;
  kpiCount.textContent = `${totals.acceptedCount} hidangan`;

  centerVal.textContent = totals.totalCalories.toLocaleString('id-ID');

  const circumference = 2 * Math.PI * 54;
  const progressRatio = Math.min(1, totals.totalCalories / totals.targetCalories);
  const strokeOffset = circumference * (1 - progressRatio);
  
  circleVal.style.strokeDasharray = `${circumference}`;
  circleVal.style.strokeDashoffset = `${strokeOffset}`;

  remainingBanner.textContent = totals.remainingCalories > 0
    ? `Masih ada sisa kuota ${totals.remainingCalories.toLocaleString('id-ID')} kkal dari target ${totals.targetCalories.toLocaleString('id-ID')} kkal hari ini.`
    : `Total kalori hari ini telah melampaui target ${totals.targetCalories.toLocaleString('id-ID')} kkal.`;

  // Macro bars
  const carbPct = Math.min(100, Math.round((totals.totalCarbs / totals.targetCarbs) * 100));
  const proteinPct = Math.min(100, Math.round((totals.totalProtein / totals.targetProtein) * 100));
  const fatPct = Math.min(100, Math.round((totals.totalFat / totals.targetFat) * 100));

  document.getElementById('macro-carb-fill').style.width = `${carbPct}%`;
  document.getElementById('macro-carb-stat').textContent = `${totals.totalCarbs}g / ${totals.targetCarbs}g`;

  document.getElementById('macro-protein-fill').style.width = `${proteinPct}%`;
  document.getElementById('macro-protein-stat').textContent = `${totals.totalProtein}g / ${totals.targetProtein}g`;

  document.getElementById('macro-fat-fill').style.width = `${fatPct}%`;
  document.getElementById('macro-fat-stat').textContent = `${totals.totalFat}g / ${totals.targetFat}g`;
}

// 3. Render 7-Day Time Series Chart (PRD: Only is_accepted = true)
function renderWeeklyChart() {
  const chartData = store.getWeeklyChartData();
  const container = document.getElementById('weekly-chart-bars');
  container.innerHTML = '';

  const maxCal = Math.max(2600, ...chartData.map((d) => d.calories));
  const targetCal = store.profile.daily_calorie_target || 2000;
  const targetPct = Math.round((targetCal / maxCal) * 100);

  // Dashed baseline indicator
  const guideline = document.createElement('div');
  guideline.className = 'target-guideline';
  guideline.style.bottom = `${targetPct}%`;
  guideline.innerHTML = `<span class="target-guideline-label">Target (${targetCal} kkal)</span>`;
  container.appendChild(guideline);

  for (const day of chartData) {
    const col = document.createElement('div');
    col.className = 'bar-col';

    const barHeightPct = Math.max(3, Math.round((day.calories / maxCal) * 100));
    const isTodayClass = day.isToday ? 'bar-today' : '';

    col.innerHTML = `
      <div class="bar-tooltip">
        <strong>${day.dayName}</strong>: ${day.calories.toLocaleString('id-ID')} kkal
      </div>
      <div class="bar-rect ${isTodayClass}" style="height: ${barHeightPct}%;"></div>
      <div class="bar-label-day">${day.dayName}</div>
    `;

    container.appendChild(col);
  }
}

// 4. Render Today's Food Diary List
function renderMealList() {
  const acceptedToday = store.getAcceptedScansForDate(new Date());
  const container = document.getElementById('meal-list-container');
  const emptyState = document.getElementById('meal-empty-state');

  if (acceptedToday.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  container.innerHTML = '';

  for (const item of acceptedToday) {
    const row = document.createElement('div');
    row.className = 'meal-row-card';

    const timeFormatted = new Date(item.accepted_at || item.scanned_at).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const componentsSummary = (item.components || []).map((c) => c.name).join(', ') || 'Rincian menu tercatat';
    const portionLabel = item.portion === 1 ? '1 porsi standar' : `${item.portion}x porsi`;

    row.innerHTML = `
      <div class="meal-main-info">
        <span class="meal-time-pill">${item.meal_type || 'Makan'} &middot; ${timeFormatted}</span>
        <div class="meal-text-details">
          <div class="meal-title-row">
            <span class="meal-food-name">${item.detected_food_name}</span>
            <span class="meal-portion-tag">(${portionLabel})</span>
          </div>
          <div class="meal-components-line">${componentsSummary}</div>
        </div>
      </div>
      <div class="meal-nutrition-info">
        <div class="meal-macros-mini">
          <span>P: ${item.protein_g}g</span>
          <span>K: ${item.carbs_g}g</span>
          <span>L: ${item.fat_g}g</span>
        </div>
        <div class="meal-cals">
          ${item.total_calories}<span class="meal-cals-unit">kkal</span>
        </div>
        <button class="btn btn-pill btn-danger delete-meal-btn" data-id="${item.id}" title="Hapus catatan ini">
          Hapus
        </button>
      </div>
    `;

    container.appendChild(row);
  }

  // Attach delete handlers
  container.querySelectorAll('.delete-meal-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      store.deleteScan(id);
      showToast('Catatan makanan berhasil dihapus dari jurnal.');
    });
  });
}

// 5. SCANNER MODAL CONTROLLER & THE DECISION GATE
const scanModal = document.getElementById('scan-modal');
const openScanBtn = document.getElementById('open-scan-btn');
const closeScanBtn = document.getElementById('close-scan-btn');
const videoFeed = document.getElementById('camera-video');
const captureBtn = document.getElementById('btn-capture-photo');
const fileInput = document.getElementById('file-upload-input');
const sampleBtns = document.querySelectorAll('.sample-thumb-btn');

const skeletonArea = document.getElementById('scanner-skeleton');
const decisionGateArea = document.getElementById('scanner-decision-gate');
const nonFoodAlertArea = document.getElementById('scanner-non-food-alert');

// Open / Close Scanner Modal
openScanBtn.addEventListener('click', () => {
  openScanModal();
});

closeScanBtn.addEventListener('click', () => {
  closeScanModal();
});

function openScanModal() {
  scanModal.classList.add('active');
  resetScannerUI();
  startCamera();
}

function closeScanModal() {
  scanModal.classList.remove('active');
  stopCamera();
  resetScannerUI();
}

// Camera Hardware Stream API
async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('Peramban tidak mendukung MediaDevices kamera.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    activeCameraStream = stream;
    videoFeed.srcObject = stream;
    videoFeed.play();
  } catch (err) {
    console.warn('Kamera tidak dapat diakses atau izin ditolak:', err);
  }
}

function stopCamera() {
  if (activeCameraStream) {
    for (const track of activeCameraStream.getTracks()) {
      track.stop();
    }
    activeCameraStream = null;
  }
  if (videoFeed.srcObject) {
    videoFeed.srcObject = null;
  }
}

function resetScannerUI() {
  skeletonArea.style.display = 'none';
  decisionGateArea.style.display = 'none';
  nonFoodAlertArea.style.display = 'none';
  activeTransientScan = null;
  currentPortion = 1.0;
  currentBrothOil = 'standar';
  updatePortionDisplay();
}

// Capture from camera video element
captureBtn.addEventListener('click', async () => {
  if (!activeCameraStream) {
    // If camera not permitted, run sample food recognition
    triggerAnalysis('nasi_padang');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoFeed.videoWidth || 640;
  canvas.height = videoFeed.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoFeed, 0, 0, canvas.width, canvas.height);

  try {
    const compressed = await vision.compressImage(canvas);
    triggerAnalysis('custom', compressed.dataUrl);
  } catch {
    triggerAnalysis('nasi_padang');
  }
});

// File Upload Handler (JPG, PNG, WEBP)
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const compressed = await vision.compressImage(file);
    triggerAnalysis('custom', compressed.dataUrl);
  } catch (err) {
    showToast('Gagal memproses berkas foto.');
  }
});

// Sample Test Buttons
sampleBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const sampleKey = btn.getAttribute('data-sample');
    triggerAnalysis(sampleKey);
  });
});

// Run Vision Analysis & Render Transient State
async function triggerAnalysis(sampleKey, customDataUrl = null) {
  // Show skeleton loader
  skeletonArea.style.display = 'flex';
  decisionGateArea.style.display = 'none';
  nonFoodAlertArea.style.display = 'none';

  try {
    const result = await vision.analyzeFoodImage(customDataUrl, sampleKey);
    renderTransientDecisionGate(result, customDataUrl);
  } catch (err) {
    showToast('Terjadi kendala saat menganalisis foto.');
    skeletonArea.style.display = 'none';
  }
}

// PRD DECISION GATE: Render Transient State
function renderTransientDecisionGate(scanResult, imageDataUrl) {
  skeletonArea.style.display = 'none';

  // Edge Case: Non-Food Object
  if (!scanResult.is_food) {
    nonFoodAlertArea.style.display = 'block';
    decisionGateArea.style.display = 'none';
    document.getElementById('non-food-message').textContent = scanResult.culinary_notes;
    return;
  }

  // Valid Food -> Show Decision Gate Panel
  nonFoodAlertArea.style.display = 'none';
  decisionGateArea.style.display = 'block';

  activeTransientScan = {
    ...scanResult,
    image_url: imageDataUrl,
    scanned_at: new Date().toISOString()
  };

  currentPortion = 1.0;
  currentBrothOil = 'standar';
  currentMealType = 'Makan Siang';

  updateDecisionGateMetrics();
}

function updateDecisionGateMetrics() {
  if (!activeTransientScan) return;

  const baseCals = activeTransientScan.total_calories;
  const baseProtein = activeTransientScan.protein_g;
  const baseCarbs = activeTransientScan.carbs_g;
  const baseFat = activeTransientScan.fat_g;

  // Local culinary broth/oil modifier
  let brothModifier = 0;
  if (currentBrothOil === 'tiris') brothModifier = -70;
  if (currentBrothOil === 'banyak') brothModifier = +90;

  const adjustedCalories = Math.max(50, Math.round((baseCals + brothModifier) * currentPortion));
  const adjustedProtein = Math.round(baseProtein * currentPortion);
  const adjustedCarbs = Math.round(baseCarbs * currentPortion);
  const adjustedFat = Math.max(2, Math.round((baseFat + (brothModifier / 9)) * currentPortion));

  // Update display DOM
  document.getElementById('gate-food-name').textContent = activeTransientScan.detected_food_name;
  document.getElementById('gate-total-cals').textContent = `${adjustedCalories} kkal`;
  document.getElementById('gate-weight-confidence').textContent = 
    `Estimasi berat: ${Math.round(activeTransientScan.estimated_total_weight_g * currentPortion)}g &middot; Tingkat keyakinan AI: ${activeTransientScan.confidence_score}%`;
  
  document.getElementById('gate-macro-p').textContent = `Protein: ${adjustedProtein}g`;
  document.getElementById('gate-macro-k').textContent = `Karbo: ${adjustedCarbs}g`;
  document.getElementById('gate-macro-l').textContent = `Lemak: ${adjustedFat}g`;

  // Components breakdown
  const componentsListEl = document.getElementById('gate-components-list');
  componentsListEl.innerHTML = '';
  for (const comp of activeTransientScan.components || []) {
    const itemEl = document.createElement('div');
    itemEl.className = 'breakdown-item-row';
    itemEl.innerHTML = `
      <span class="breakdown-item-name">${comp.name}</span>
      <span class="breakdown-item-meta">
        <span>${Math.round(comp.weight_g * currentPortion)}g</span>
        <span>${Math.round(comp.calories * currentPortion)} kkal</span>
      </span>
    `;
    componentsListEl.appendChild(itemEl);
  }

  // Culinary note
  document.getElementById('gate-culinary-note').textContent = activeTransientScan.culinary_notes || '';

  // Broth chips active state
  document.querySelectorAll('.broth-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.getAttribute('data-val') === currentBrothOil);
  });

  // Meal type chips active state
  document.querySelectorAll('.meal-type-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.getAttribute('data-val') === currentMealType);
  });

  updatePortionDisplay();
}

function updatePortionDisplay() {
  const display = document.getElementById('portion-val-display');
  if (display) {
    display.textContent = `${currentPortion}x porsi`;
  }
}

// Portion Steppers
document.getElementById('btn-portion-minus')?.addEventListener('click', () => {
  if (currentPortion > 0.5) {
    currentPortion = parseFloat((currentPortion - 0.25).toFixed(2));
    updateDecisionGateMetrics();
  }
});

document.getElementById('btn-portion-plus')?.addEventListener('click', () => {
  if (currentPortion < 3.0) {
    currentPortion = parseFloat((currentPortion + 0.25).toFixed(2));
    updateDecisionGateMetrics();
  }
});

// Broth / Oil Choice Chips
document.querySelectorAll('.broth-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    currentBrothOil = chip.getAttribute('data-val');
    updateDecisionGateMetrics();
  });
});

// Meal Type Choice Chips
document.querySelectorAll('.meal-type-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    currentMealType = chip.getAttribute('data-val');
    updateDecisionGateMetrics();
  });
});

// PRD CORE ACTION: DECISION GATE BUTTONS
// OPSI A: ACCEPT / CATAT MAKANAN INI
document.getElementById('btn-gate-accept').addEventListener('click', () => {
  if (!activeTransientScan) return;

  // Finalize transient state into permanent ACCEPTED record
  store.acceptScan(activeTransientScan, {
    mealType: currentMealType,
    portion: currentPortion,
    brothOil: currentBrothOil
  });

  closeScanModal();
  showToast(`Makanan berhasil dicatat ke jurnal ${currentMealType}.`);
});

// OPSI B: ABAIKAN / BATAL (Transient discarded, daily calories untouched)
document.getElementById('btn-gate-cancel').addEventListener('click', () => {
  closeScanModal();
  showToast('Hasil pemindaian dibatalkan. Data tidak dimasukkan ke dalam grafik harian.');
});

// 6. PROFILE & AUTH SETTINGS MODAL
const settingsModal = document.getElementById('settings-modal');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsForm = document.getElementById('profile-settings-form');
const resetDataBtn = document.getElementById('btn-reset-sample-data');

openSettingsBtn.addEventListener('click', () => {
  loadProfileToForm();
  settingsModal.classList.add('active');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('active');
});

function loadProfileToForm() {
  const p = store.profile;
  document.getElementById('set-name').value = p.name || '';
  document.getElementById('set-email').value = p.email || '';
  document.getElementById('set-phone').value = p.phone_number || '';
  document.getElementById('set-target').value = p.daily_calorie_target || 2000;
  document.getElementById('set-weight').value = p.weight_kg || 68;
  document.getElementById('set-height').value = p.height_cm || 172;
  document.getElementById('set-age').value = p.age || 28;
  document.getElementById('set-gemini-key').value = vision.geminiApiKey || '';
}

settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const updated = {
    name: document.getElementById('set-name').value.trim() || 'Pengguna',
    email: document.getElementById('set-email').value.trim(),
    phone_number: document.getElementById('set-phone').value.trim(),
    daily_calorie_target: parseInt(document.getElementById('set-target').value, 10) || 2000,
    weight_kg: parseFloat(document.getElementById('set-weight').value) || 68,
    height_cm: parseFloat(document.getElementById('set-height').value) || 172,
    age: parseInt(document.getElementById('set-age').value, 10) || 28
  };

  const geminiKey = document.getElementById('set-gemini-key').value.trim();
  vision.setApiKey(geminiKey);

  store.saveProfile(updated);
  settingsModal.classList.remove('active');
  showToast('Profil dan target kalori berhasil disimpan.');
});

resetDataBtn.addEventListener('click', () => {
  if (confirm('Atur ulang seluruh data ke simulasi hari aktif?')) {
    store.resetSampleData();
    showToast('Data hari ini diatur ulang ke sampel aktif.');
  }
});

// Multi-Channel Auth Simulation Buttons
document.querySelectorAll('.auth-btn-option').forEach((btn) => {
  btn.addEventListener('click', () => {
    const channel = btn.getAttribute('data-channel');
    if (channel === 'google') {
      store.saveProfile({ auth_provider: 'google', email: 'budi.santoso@gmail.com' });
      showToast('Masuk dengan akun Google.');
    } else if (channel === 'apple') {
      store.saveProfile({ auth_provider: 'apple', email: 'budi.santoso@icloud.com' });
      showToast('Masuk dengan Apple ID.');
    } else if (channel === 'phone') {
      const otp = prompt('Masukkan 4 digit kode OTP yang dikirim via WhatsApp (simulasi):', '8821');
      if (otp) {
        store.saveProfile({ auth_provider: 'phone', phone_number: '+6281234567890' });
        showToast('Login WhatsApp/OTP berhasil diverifikasi.');
      }
    }
    loadProfileToForm();
  });
});

// Reactively re-render views on store changes
store.subscribe(() => {
  renderGreeting();
  renderDailyProgress();
  renderWeeklyChart();
  renderMealList();
});

// Initial boot
renderGreeting();
renderDailyProgress();
renderWeeklyChart();
renderMealList();
