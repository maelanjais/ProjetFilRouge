// config-supabase.js - URL, clé publishable et client du projet Supabase.
export const SUPABASE_URL = 'https://psvvxonmgqrktbwuiiru.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5D2biDfALzEP6f1IilyKig_ZrfdUmb0';

let instanceClient = null;

// Renvoie l'instance réelle du client Supabase
export function obtenirClientSupabase() {
  if (!instanceClient && typeof window !== 'undefined' && window.supabase?.createClient) {
    instanceClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
  return instanceClient;
}

// Proxy sécurisé pour accéder à client.auth, client.from(), etc. sans crash au chargement
export const client = new Proxy({}, {
  get(_target, prop) {
    const s = obtenirClientSupabase();
    if (!s) {
      console.warn(`Supabase non disponible lors de l'accès à '${String(prop)}'`);
      return () => ({
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }),
        insert: () => ({ select: () => Promise.resolve({ data: [] }) }),
        channel: () => ({ on: () => ({ subscribe: () => {} }) }),
      });
    }
    const valeur = s[prop];
    return typeof valeur === 'function' ? valeur.bind(s) : valeur;
  },
});
