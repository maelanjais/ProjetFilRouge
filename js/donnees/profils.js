// profils.js - appels Supabase pour la table profils (recherche par pseudo, récupération pseudo).
// Ne touche jamais au DOM : renvoie les données ou l'erreur.
import { client } from './config-supabase.js';

const NB_MAX_RESULTATS_RECHERCHE = 10;

// Cherche les profils dont le pseudo contient le texte saisi.
// Renvoie { data: [{ id, nom_utilisateur }, ...], error }.
export async function rechercherProfils(texte, idUtilisateurConnecte) {
  return client
    .from('profils')
    .select('id, nom_utilisateur')
    .ilike('nom_utilisateur', `%${texte}%`)
    .neq('id', idUtilisateurConnecte)
    .limit(NB_MAX_RESULTATS_RECHERCHE);
}