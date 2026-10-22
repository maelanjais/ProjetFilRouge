// contacts.js - appels Supabase pour la table contacts (ajouter contact, récupérer id des contacts).
// Ne touche jamais au DOM : renvoie les données ou l'erreur.
import { client } from './config-supabase.js';

// Ajoute le contact sélectioné depuis la recherche.
// Renvoie { data, error }.
export async function ajouterContact(idUtilisateurConnecte, idContact) {
  return client
    .from('contacts')
    .insert({ proprietaire_id: idUtilisateurConnecte, contact_id: idContact });
}

// Récupère les id des contacts de l'utilisateur connecté.
// Renvoie { data: [{ contact_id }, ...], error }.
export async function recupererIdsContacts(idUtilisateurConnecte) {
  return client
    .from('contacts')
    .select('contact_id')
    .eq('proprietaire_id', idUtilisateurConnecte);
}
