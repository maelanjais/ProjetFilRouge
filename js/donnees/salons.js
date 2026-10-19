// salons.js — appels Supabase pour la table des salons de discussion.
import { client } from './config-supabase.js';

// Récupère tous les salons disponibles dans la base de données.
export async function recupererTousLesSalons() {
  return client
    .from('salons')
    .select('*')
    .order('id', { ascending: true });
}

// Crée un nouveau salon dans la base de données.
export async function creerSalonSupabase(nomSalon, creePar = null) {
  return client
    .from('salons')
    .insert([{ nom: nomSalon, cree_par: creePar }])
    .select();
}
