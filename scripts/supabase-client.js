// Hitung Sehat — Supabase Authentication & Realtime Client Bridge
import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE_URL = 'hitung_sehat_supabase_url';
const STORAGE_KEY_SUPABASE_KEY = 'hitung_sehat_supabase_key';

// Project credentials configured for daffatradejournal-cmyk's Project
const DEFAULT_SUPABASE_URL = 'https://rtsxzcqyqqrrqkcxawe.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_hvvVkvp01hUvgpvRVSR1Vg_OK7CrfEC';

class SupabaseService {
  constructor() {
    this.client = null;
    this.initClient();
  }

  getConfig() {
    // 1. Check environment variables (Vite build or Vercel env)
    let url = '';
    let key = '';

    try {
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        url = import.meta.env.VITE_SUPABASE_URL || '';
        key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      }
    } catch {}

    // 2. Check localStorage override (allow users to configure without rebuilding)
    try {
      const storedUrl = localStorage.getItem(STORAGE_KEY_SUPABASE_URL);
      const storedKey = localStorage.getItem(STORAGE_KEY_SUPABASE_KEY);
      if (storedUrl) url = storedUrl;
      if (storedKey) key = storedKey;
    } catch {}

    // 3. Fallback to active project default
    if (!url) url = DEFAULT_SUPABASE_URL;
    if (!key) key = DEFAULT_SUPABASE_KEY;

    return {
      url: url.trim(),
      key: key.trim()
    };
  }

  isConfigured() {
    const { url, key } = this.getConfig();
    return Boolean(url && key && url.startsWith('http'));
  }

  initClient() {
    const { url, key } = this.getConfig();
    if (url && key && url.startsWith('http')) {
      try {
        this.client = createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        return this.client;
      } catch (err) {
        console.warn('[Supabase] Failed to initialize client:', err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
    return null;
  }

  saveConfig(url, key) {
    try {
      if (url) localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url.trim());
      else localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);

      if (key) localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, key.trim());
      else localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
    } catch {}

    return this.initClient();
  }

  // 1. Google OAuth
  async signInWithGoogle() {
    if (!this.client) {
      throw new Error('Supabase belum dikonfigurasi. Masukkan Project URL dan Anon Key terlebih dahulu.');
    }
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  }

  // 2. Apple ID OAuth
  async signInWithApple() {
    if (!this.client) {
      throw new Error('Supabase belum dikonfigurasi. Masukkan Project URL dan Anon Key terlebih dahulu.');
    }
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  }

  // 3. Send OTP to Phone or Email
  async sendOtp({ phone, email }) {
    if (!this.client) {
      throw new Error('Supabase belum dikonfigurasi.');
    }
    if (phone) {
      const { data, error } = await this.client.auth.signInWithOtp({
        phone: phone.startsWith('+') ? phone : `+62${phone}`
      });
      if (error) throw error;
      return data;
    } else if (email) {
      const { data, error } = await this.client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true
        }
      });
      if (error) throw error;
      return data;
    }
    throw new Error('Nomor telepon atau email diperlukan.');
  }

  // 4. Verify OTP Code
  async verifyOtp({ phone, email, token }) {
    if (!this.client) {
      throw new Error('Supabase belum dikonfigurasi.');
    }
    if (phone) {
      const formattedPhone = phone.startsWith('+') ? phone : `+62${phone}`;
      const { data, error } = await this.client.auth.verifyOtp({
        phone: formattedPhone,
        token: token.trim(),
        type: 'sms'
      });
      if (error) throw error;
      return data;
    } else if (email) {
      const { data, error } = await this.client.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'email'
      });
      if (error) throw error;
      return data;
    }
    throw new Error('Nomor telepon atau email diperlukan.');
  }

  // 5. Sign Out
  async signOut() {
    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch (err) {
        console.warn('[Supabase] Sign out warning:', err);
      }
    }
  }

  // 6. Listen to Realtime Auth State Changes
  onAuthStateChange(callback) {
    if (!this.client) return null;

    // Check initial active session
    this.client.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session && session.user) {
        callback('INITIAL_SESSION', session);
      }
    });

    const { data: { subscription } } = this.client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });

    return subscription;
  }
}

export const supabaseService = new SupabaseService();
