// Hitung Sehat — State Store & PRD Decision Gate Logic
// Manages transient (SCANNED_ONLY) vs permanent (ACCEPTED) states.

const STORAGE_KEY_PROFILE = 'hitung_sehat_user_profile_v1';
const STORAGE_KEY_SCANS = 'hitung_sehat_food_scans_v1';

// Default user profile conforming to PRD schema
const DEFAULT_PROFILE = {
  id: 'usr-83921',
  name: 'Budi Santoso',
  email: 'budi.santoso@email.com',
  phone_number: '+6281234567890',
  auth_provider: 'google', // 'google' | 'apple' | 'phone' | 'email'
  daily_calorie_target: 2000,
  weight_kg: 68,
  height_cm: 172,
  age: 28,
  created_at: new Date().toISOString()
};

// Seed realistic accepted meals for today so user tests an active day
function generateSeedScans() {
  const today = new Date();
  const formatTime = (hours, minutes) => {
    const d = new Date(today);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: 'scn-101',
      user_id: 'usr-83921',
      image_url: null,
      detected_food_name: 'Bubur Ayam Komplit',
      total_calories: 410,
      protein_g: 18,
      carbs_g: 62,
      fat_g: 11,
      portion: 1.0,
      broth_oil_adjustment: 'standar',
      meal_type: 'Sarapan',
      is_accepted: true,
      scanned_at: formatTime(7, 30),
      accepted_at: formatTime(7, 32),
      components: [
        { name: 'Bubur Beras', weight_g: 200, calories: 180 },
        { name: 'Suwir Daging Ayam', weight_g: 60, calories: 120 },
        { name: 'Cakwe & Kerupuk', weight_g: 25, calories: 75 },
        { name: 'Kuah Kaldu Kuning & Seledri', weight_g: 40, calories: 35 }
      ]
    },
    {
      id: 'scn-102',
      user_id: 'usr-83921',
      image_url: null,
      detected_food_name: 'Nasi Campur Ayam Bakar & Lalapan',
      total_calories: 630,
      protein_g: 42,
      carbs_g: 78,
      fat_g: 16,
      portion: 1.0,
      broth_oil_adjustment: 'tiris',
      meal_type: 'Makan Siang',
      is_accepted: true,
      scanned_at: formatTime(12, 45),
      accepted_at: formatTime(12, 48),
      components: [
        { name: 'Nasi Putih', weight_g: 160, calories: 208 },
        { name: 'Ayam Bakar Bagian Dada', weight_g: 130, calories: 265 },
        { name: 'Tahu & Tempe Bacem', weight_g: 70, calories: 115 },
        { name: 'Sambal Terasi & Timun Lalap', weight_g: 40, calories: 42 }
      ]
    },
    {
      id: 'scn-103',
      user_id: 'usr-83921',
      image_url: null,
      detected_food_name: 'Kopi Hitam & Pisang Rebus',
      total_calories: 140,
      protein_g: 2,
      carbs_g: 34,
      fat_g: 0.5,
      portion: 1.0,
      broth_oil_adjustment: 'standar',
      meal_type: 'Camilan',
      is_accepted: true,
      scanned_at: formatTime(16, 10),
      accepted_at: formatTime(16, 12),
      components: [
        { name: 'Pisang Kepok Rebus (1 Buah)', weight_g: 100, calories: 135 },
        { name: 'Kopi Hitam Tanpa Gula', weight_g: 200, calories: 5 }
      ]
    }
  ];
}

export class Store {
  constructor() {
    this.listeners = new Set();
    this.profile = this.loadProfile();
    this.scans = this.loadScans();
  }

  loadProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PROFILE);
      return data ? JSON.parse(data) : { ...DEFAULT_PROFILE };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  }

  saveProfile(updated) {
    this.profile = { ...this.profile, ...updated };
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(this.profile));
    } catch {}
    this.notify();
  }

  loadScans() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SCANS);
      if (data) {
        return JSON.parse(data);
      }
      const initial = generateSeedScans();
      localStorage.setItem(STORAGE_KEY_SCANS, JSON.stringify(initial));
      return initial;
    } catch {
      return generateSeedScans();
    }
  }

  saveScans() {
    try {
      localStorage.setItem(STORAGE_KEY_SCANS, JSON.stringify(this.scans));
    } catch {}
    this.notify();
  }

  // Subscribe to changes
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    for (const fn of this.listeners) {
      fn();
    }
  }

  // PRD Rule: Today's calculations MUST only include is_accepted === true
  getAcceptedScansForDate(targetDate = new Date()) {
    const targetDayStr = targetDate.toISOString().slice(0, 10);
    return this.scans.filter((scan) => {
      if (!scan.is_accepted) return false;
      const scanDate = new Date(scan.accepted_at || scan.scanned_at).toISOString().slice(0, 10);
      return scanDate === targetDayStr;
    });
  }

  getTodayTotals() {
    const acceptedToday = this.getAcceptedScansForDate(new Date());
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const item of acceptedToday) {
      totalCalories += Math.round(item.total_calories || 0);
      totalProtein += Math.round(item.protein_g || 0);
      totalCarbs += Math.round(item.carbs_g || 0);
      totalFat += Math.round(item.fat_g || 0);
    }

    const target = this.profile.daily_calorie_target || 2000;
    const remaining = Math.max(0, target - totalCalories);
    const percentage = Math.min(100, Math.round((totalCalories / target) * 100));

    // Balanced macro target heuristics (Carb ~50%, Protein ~25%, Fat ~25%)
    const targetCarbs = Math.round((target * 0.50) / 4); // 4 kcal per g
    const targetProtein = Math.round((target * 0.25) / 4); // 4 kcal per g
    const targetFat = Math.round((target * 0.25) / 9); // 9 kcal per g

    return {
      acceptedCount: acceptedToday.length,
      totalCalories,
      targetCalories: target,
      remainingCalories: remaining,
      percentage,
      totalProtein,
      targetProtein,
      totalCarbs,
      targetCarbs,
      totalFat,
      targetFat
    };
  }

  // 7-Day Time Series for Dashboard Chart (Only is_accepted = true)
  getWeeklyChartData() {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const result = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = days[d.getDay()];

      const acceptedScans = this.scans.filter((s) => {
        if (!s.is_accepted) return false;
        const sDate = new Date(s.accepted_at || s.scanned_at).toISOString().slice(0, 10);
        return sDate === dateStr;
      });

      const dayCalories = acceptedScans.reduce((sum, s) => sum + Math.round(s.total_calories || 0), 0);

      result.push({
        date: dateStr,
        dayName,
        calories: dayCalories,
        target: this.profile.daily_calorie_target || 2000,
        isToday: i === 0
      });
    }

    return result;
  }

  // PRD DECISION GATE:
  // Accept scan -> changes status to is_accepted: true, adds timestamp, records meal
  acceptScan(transientScan, { mealType = 'Makan Siang', portion = 1.0, brothOil = 'standar' }) {
    const finalCalories = Math.round(transientScan.total_calories * portion);
    const finalProtein = Math.round(transientScan.protein_g * portion);
    const finalCarbs = Math.round(transientScan.carbs_g * portion);
    const finalFat = Math.round(transientScan.fat_g * portion);

    const acceptedRecord = {
      id: `scn-${Date.now()}`,
      user_id: this.profile.id,
      image_url: transientScan.image_url || null,
      detected_food_name: transientScan.detected_food_name,
      total_calories: finalCalories,
      protein_g: finalProtein,
      carbs_g: finalCarbs,
      fat_g: finalFat,
      portion,
      broth_oil_adjustment: brothOil,
      meal_type: mealType,
      is_accepted: true,
      scanned_at: transientScan.scanned_at || new Date().toISOString(),
      accepted_at: new Date().toISOString(),
      components: (transientScan.components || []).map((c) => ({
        name: c.name,
        weight_g: Math.round((c.weight_g || 100) * portion),
        calories: Math.round((c.calories || 100) * portion)
      }))
    };

    this.scans.unshift(acceptedRecord);
    this.saveScans();
    return acceptedRecord;
  }

  // Delete / Undo accepted meal
  deleteScan(scanId) {
    this.scans = this.scans.filter((s) => s.id !== scanId);
    this.saveScans();
  }

  // Reset to default sample day
  resetSampleData() {
    this.scans = generateSeedScans();
    this.saveScans();
  }
}
