// messages.js — appels Supabase pour la table des messages (lecture, écriture, temps réel).
import { client } from './config-supabase.js';

// Récupère la liste des messages d'un salon donné par ordre chronologique.
export async function recupererMessagesParSalon(salonId = 1) {
  return client
    .from('messages')
    .select('*')
    .eq('salon_id', salonId)
    .order('date_creation', { ascending: true });
}

// Envoie un nouveau message dans la base de données.
export async function envoyerMessageSupabase({
  salonId = 1,
  contenu = '',
  auteurPseudo = 'Anonyme',
  auteurId = null,
}) {
  return client
    .from('messages')
    .insert([
      {
        salon_id: salonId,
        contenu,
        auteur_pseudo: auteurPseudo,
        auteur_id: auteurId,
      },
    ])
    .select();
}

// Écoute les nouveaux messages insérés en temps réel pour un salon donné.
export function ecouterNouveauxMessages(salonId = 1, auNouveauMessage) {
  const canal = client
    .channel(`temps-reel-messages-salon-${salonId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `salon_id=eq.${salonId}`,
      },
      (payload) => {
        if (payload.new && typeof auNouveauMessage === 'function') {
          auNouveauMessage(payload.new);
        }
      }
    )
    .subscribe();

  return canal;
}

// Désabonne un canal temps réel Supabase.
export function arreterEcouteTempsReel(canal) {
  if (canal && client) {
    client.removeChannel(canal);
  }
}

// Récupère le dernier message de chacun des salons donnés (vue derniers_messages).
// Renvoie { data: [{ salon_id, contenu, auteur_id, auteur_pseudo, date_creation }, ...], error }.
export async function recupererDerniersMessages(idsSalons) {
  return client
    .from('derniers_messages')
    .select('salon_id, contenu, auteur_id, auteur_pseudo, date_creation')
    .in('salon_id', idsSalons);
}

