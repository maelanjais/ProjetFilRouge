// contacts.js - appels Supabase pour la table contacts : ajout d'un contact,
// récupération des contacts (id seuls ou avec pseudo).
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

// Récupère les contacts de l'utilisateur connecté avec leur pseudo.
// Renvoie { data: [{ contact: { id, nom_utilisateur } }, ...], error }.
export async function recupererContacts(idUtilisateurConnecte) {
  return client
    .from('contacts')
    .select('contact:profils!contact_id(id, nom_utilisateur)')
    .eq('proprietaire_id', idUtilisateurConnecte);
}

