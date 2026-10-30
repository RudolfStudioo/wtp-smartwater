// Configuration for Supabase - project "wtp" (Singapore)
export const SUPABASE_URL = window.SUPABASE_URL || 'https://ldjgjggfkkblvahzcvcd.supabase.co';
export const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_RlhIFHZhXa3uNjXc7p2w-g_riyBp3ST';

export const DEVICES = ['WM-001', 'WM-002', 'WM-003'];
export const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'monitoring', label: 'Monitoring' },
];

export const TARIF_PER_LITER = 2000; // Rp per liter (cadangan; sumber asli: tabel app_settings)
export const MIN_NOMINAL = 10000;
export const MAX_NOMINAL = 1000000;
export const QUICK_NOMINALS = [20000, 50000, 100000, 200000];
