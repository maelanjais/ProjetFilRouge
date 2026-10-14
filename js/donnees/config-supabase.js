// config-supabase.js - URL, clé publishable et client du projet Supabase.
export const SUPABASE_URL = 'https://psvvxonmgqrktbwuiiru.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5D2biDfALzEP6f1IilyKig_ZrfdUmb0';
export const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);