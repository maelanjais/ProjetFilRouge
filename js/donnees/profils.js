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

// Remplace le pseudo de l'utilisateur connecté. Renvoie { error } ; error.code vaut
// '23505' si le pseudo est déjà pris (index unique) et '23514' s'il ne fait pas
// 3 à 30 caractères (contrainte check).
export async function changerPseudoProfil(idUtilisateurConnecte, nouveauPseudo) {
  return client
    .from('profils')
    .update({ nom_utilisateur: nouveauPseudo })
    .eq('id', idUtilisateurConnecte);
}

// Récupère le pseudo de l'utilisateur connecté. single() renvoie l'objet seul
// plutôt qu'un tableau, puisqu'un id ne correspond qu'à un profil.
// Renvoie { data: { nom_utilisateur }, error }.
export async function recupererPseudo(idUtilisateurConnecte) {
  return client
    .from('profils')
    .select('nom_utilisateur')
    .eq('id', idUtilisateurConnecte)
    .single();
}

// Renvoie { id, pseudo } de l'utilisateur connecté, ou null si personne ne l'est.
// Le pseudo vient de la table profils (à jour après un changement de pseudo) ;
// si elle ne répond pas, on se rabat sur le début du courriel plutôt que d'échouer.
export async function recupererUtilisateurConnecte() {
  const { data } = await client.auth.getSession();
  const utilisateur = data.session?.user;
  if (!utilisateur) {
    return null;
  }
  const { data: profil } = await recupererPseudo(utilisateur.id);
  return {
    id: utilisateur.id,
    pseudo: profil?.nom_utilisateur || utilisateur.email.split('@')[0],
  };
}