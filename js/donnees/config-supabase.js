// config-supabase.js - URL, clé publishable et client du projet Supabase.
// window.supabase est fourni par le script CDN, chargé avant les modules sur
// chaque page (voir le <head> des fichiers HTML).
export const SUPABASE_URL = 'https://psvvxonmgqrktbwuiiru.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5D2biDfALzEP6f1IilyKig_ZrfdUmb0';
export const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
