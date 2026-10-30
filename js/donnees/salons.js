// salons.js - appels Supabase pour la table salons : conversations à deux
// participants (cree_par et participant_id). Ne touche jamais au DOM.
import { client } from './config-supabase.js';

// Colonnes lues pour un salon, avec le pseudo des deux participants. salons a deux
// clés étrangères vers profils : !cree_par et !participant_id précisent laquelle suivre.
const COLONNES_SALON = `id, cree_par, participant_id,
  createur:profils!cree_par(nom_utilisateur),
  participant:profils!participant_id(nom_utilisateur)`;

// Récupère les salons dont l'utilisateur est l'un des deux participants.
// Renvoie { data: [{ id, cree_par, participant_id, createur, participant }, ...], error }.
export async function recupererSalonsUtilisateur(idUtilisateur) {
  return client
    .from('salons')
    .select(COLONNES_SALON)
    .or(`cree_par.eq.${idUtilisateur},participant_id.eq.${idUtilisateur}`)
    .order('id', { ascending: true });
}

// Cherche le salon entre deux utilisateurs, quel que soit celui qui l'a créé.
// Renvoie { data: salon ou null s'il n'existe pas, error }.
export async function trouverSalonEntre(idUtilisateur, idContact) {
  return client
    .from('salons')
    .select(COLONNES_SALON)
    .or(`and(cree_par.eq.${idUtilisateur},participant_id.eq.${idContact}),`
      + `and(cree_par.eq.${idContact},participant_id.eq.${idUtilisateur})`)
    .limit(1)
    .maybeSingle();
}

// Crée un salon entre l'utilisateur et un contact. Renvoie { data: salon, error }.
export async function creerSalon(idUtilisateur, idContact) {
  return client
    .from('salons')
    .insert({ cree_par: idUtilisateur, participant_id: idContact })
    .select(COLONNES_SALON)
    .single();
}
