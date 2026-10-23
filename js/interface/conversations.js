// conversations.js — gestion de la liste des conversations et des salons Supabase :
// sélection, recherche, synchronisation temps réel et contacts.

import {
  chargerHistoriqueMessages,
  mettreAJourEnteteDiscussion,
  formaterHeureCourante,
  ajouterMessage,
} from './discussion.js';
import { fermerContacts } from './contacts.js';
import {
  recupererMessagesParSalon,
  ecouterNouveauxMessages,
  arreterEcouteTempsReel,
} from '../donnees/messages.js';
import { recupererTousLesSalons } from '../donnees/salons.js';
import { recupererSession } from '../donnees/authentification.js';

let canalTempsReelActif = null;

// Historique de messages pour les contacts réguliers
const historiqueContacts = {
  'Mbappé': [
    { texte: 'Salut, tu as regardé le planning de la semaine ?', estEnvoye: false, heure: '14:02' },
    { texte: 'Oui, jeudi après-midi ça me va.', estEnvoye: true, heure: '14:05' },
    { texte: 'Parfait. Je bloque 14 h – 16 h et j'invite Thomas.', estEnvoye: false, heure: '14:06' },
    { texte: 'On se cale ça pour jeudi ?', estEnvoye: false, heure: '14:12' },
  ],
  'Couscous': [
    { texte: 'Salut ! Tu viens manger ce midi ?', estEnvoye: false, heure: '12:30' },
    { texte: 'Tu es où ?', estEnvoye: false, heure: '13:45' },
    { texte: 'j'arrive dans 10', estEnvoye: true, heure: '13:50' },
  ],
  'Bot6': [
    { texte: 'Initialisation des services en cours...', estEnvoye: false, heure: 'Hier' },
    { texte: 'Sauvegarde terminée avec succès.', estEnvoye: false, heure: 'Hier' },
  ],
  'Babouche': [
    { texte: 'Regarde les photos de la rando !', estEnvoye: false, heure: 'Lun.' },
    { texte: 'Photo reçue', estEnvoye: false, heure: 'Lun.' },
  ],
  'Thomas': [
    { texte: 'Est-ce que tu peux valider les maquettes ?', estEnvoye: false, heure: '3 j' },
    { texte: 'noté, merci', estEnvoye: true, heure: '3 j' },
  ],
};

// Renvoie le nom de la conversation active.
export function recupererNomConversationActive() {
  const itemActif = document.querySelector('.conversation-item--active');
  if (!itemActif) return 'Salon 1';
  const elementNom = itemActif.querySelector('.conversation-item__nom');
  return elementNom ? elementNom.textContent.trim() : 'Salon 1';
}

// Met à jour le compteur de conversations visibles.
export function mettreAJourCompteur() {
  const compteur = document.querySelector('.conversations__compteur');
  const liste = document.querySelector('.conversations__liste');
  if (!compteur || !liste) return;
  const visibles = liste.querySelectorAll('.conversation-item:not(.masque)');
  compteur.textContent = visibles.length;
}

// Charge un salon Supabase avec ses vrais messages et active le temps réel.
export async function chargerSalonSupabase(salonId, nomSalon) {
  window.salonIdActuel = salonId;

  if (canalTempsReelActif) {
    arreterEcouteTempsReel(canalTempsReelActif);
    canalTempsReelActif = null;
  }

  let pseudoActuel = '';
  let userIdActuel = null;
  try {
    const { data } = await recupererSession();
    if (data?.session?.user) {
      userIdActuel = data.session.user.id;
      pseudoActuel = data.session.user.user_metadata?.nom_utilisateur
        || data.session.user.email?.split('@')[0]
        || '';
    }
  } catch (e) {
    console.warn(e);
  }

  mettreAJourEnteteDiscussion(nomSalon);

  // Chargement des messages depuis Supabase
  try {
    const { data: messages, error } = await recupererMessagesParSalon(salonId);
    if (!error && Array.isArray(messages)) {
      const messagesFormates = messages.map((m) => {
        const estEnvoye = (userIdActuel && m.auteur_id === userIdActuel)
          || (pseudoActuel && m.auteur_pseudo === pseudoActuel);
        return {
          texte: m.contenu || '',
          estEnvoye,
          auteurPseudo: m.auteur_pseudo || 'Membre',
          heure: formaterHeureCourante(m.date_creation),
        };
      });
      chargerHistoriqueMessages(messagesFormates);
    }
  } catch (err) {
    console.warn('Erreur chargement messages salon :', err);
  }

  // Écoute des nouveaux messages en temps réel
  try {
    canalTempsReelActif = ecouterNouveauxMessages(salonId, (nouveauMsg) => {
      const estDeMoi = (userIdActuel && nouveauMsg.auteur_id === userIdActuel)
        || (pseudoActuel && nouveauMsg.auteur_pseudo === pseudoActuel);

      if (!estDeMoi) {
        ajouterMessage({
          texte: nouveauMsg.contenu || '',
          estEnvoye: false,
          auteurPseudo: nouveauMsg.auteur_pseudo || 'Membre',
          heure: formaterHeureCourante(nouveauMsg.date_creation),
        });
      }
    });
  } catch (err) {
    console.warn('Temps réel non disponible :', err);
  }
}

// Active une conversation sélectionnée dans la liste.
export function activerConversation(elementItem) {
  if (!elementItem) return;

  const ancienActif = document.querySelector('.conversation-item--active');
  if (ancienActif) {
    ancienActif.classList.remove('conversation-item--active');
  }
  elementItem.classList.add('conversation-item--active');

  const badgeNonLu = elementItem.querySelector('.badge-non-lu');
  if (badgeNonLu) {
    badgeNonLu.remove();
  }

  const salonId = elementItem.dataset.salonId;
  const elementNom = elementItem.querySelector('.conversation-item__nom');
  const nom = elementNom ? elementNom.textContent.trim() : '';

  if (salonId) {
    chargerSalonSupabase(Number(salonId), nom);
  } else {
    // Si c'est un contact régulier
    window.salonIdActuel = null;
    if (canalTempsReelActif) {
      arreterEcouteTempsReel(canalTempsReelActif);
      canalTempsReelActif = null;
    }

    mettreAJourEnteteDiscussion(nom);
    const messages = historiqueContacts[nom] || [];
    chargerHistoriqueMessages(messages);
  }
}

// Crée un élément de salon Supabase pour la liste.
function creerElementSalon(salon, estActif = false) {
  const li = document.createElement('li');
  li.className = `conversation-item ${estActif ? 'conversation-item--active' : ''}`;
  li.dataset.salonId = salon.id;

  li.innerHTML = `
    <div class="conversation-item__contenu">
      <div class="conversation-item__ligne">
        <span class="conversation-item__nom">${salon.nom}</span>
        <span class="conversation-item__heure">En direct</span>
      </div>
      <div class="conversation-item__ligne">
        <p class="conversation-item__apercu">Salon public Supabase</p>
      </div>
    </div>
  `;
  return li;
}

// Initialise les salons réels depuis la base de données Supabase.
async function initialiserSalonsSupabase() {
  const listeConversations = document.querySelector('.conversations__liste');
  if (!listeConversations) return;

  try {
    const { data: salons, error } = await recupererTousLesSalons();
    if (!error && Array.isArray(salons) && salons.length > 0) {
      const premierSalon = salons[0];

      // Insérer les salons en début de liste
      [...salons].reverse().forEach((salon) => {
        const estPremier = (salon.id === premierSalon.id);
        const el = creerElementSalon(salon, estPremier);
        listeConversations.prepend(el);
      });

      // Retirer l'état actif des anciens éléments
      const items = listeConversations.querySelectorAll('.conversation-item');
      items.forEach((it) => {
        if (!it.dataset.salonId) {
          it.classList.remove('conversation-item--active');
        }
      });

      // Charger les messages du premier salon
      chargerSalonSupabase(premierSalon.id, premierSalon.nom);
      mettreAJourCompteur();
    }
  } catch (err) {
    console.warn('Impossible de charger les salons Supabase :', err);
  }
}

// ---- Branchement immédiat des écouteurs d'événements ----

function attacherEcouteurs() {
  const liste = document.querySelector('.conversations__liste');
  const champRecherche = document.getElementById('champ-recherche');
  const itemsContacts = document.querySelectorAll('.panneau-contacts__item');

  // 1. Clic sur une conversation (délégation d'événement sur la liste)
  if (liste) {
    liste.addEventListener('click', (evenement) => {
      const item = evenement.target.closest('.conversation-item');
      if (item) {
        activerConversation(item);
      }
    });
  }

  // 2. Recherche en direct
  if (champRecherche) {
    champRecherche.addEventListener('input', () => {
      const requete = champRecherche.value.trim().toLowerCase();
      const items = document.querySelectorAll('.conversations__liste .conversation-item');

      items.forEach((item) => {
        const elNom = item.querySelector('.conversation-item__nom');
        const nom = elNom ? elNom.textContent.toLowerCase() : '';
        if (nom.includes(requete)) {
          item.classList.remove('masque');
        } else {
          item.classList.add('masque');
        }
      });

      mettreAJourCompteur();
    });
  }

  // 3. Clic sur les contacts du panneau latéral
  itemsContacts.forEach((itemContact) => {
    itemContact.addEventListener('click', () => {
      const elNom = itemContact.querySelector('.panneau-contacts__nom');
      if (!elNom) return;

      const nom = elNom.textContent.trim();
      const items = document.querySelectorAll('.conversations__liste .conversation-item');
      let itemTrouve = null;

      items.forEach((item) => {
        const nomItem = item.querySelector('.conversation-item__nom');
        if (nomItem && nomItem.textContent.trim().toLowerCase() === nom.toLowerCase()) {
          itemTrouve = item;
        }
      });

      if (itemTrouve) {
        activerConversation(itemTrouve);
      }
      fermerContacts();
    });
  });

  // 4. Mise à jour de l'aperçu du dernier message
  document.addEventListener('message-ajoute', (evenement) => {
    const { texte, estEnvoye } = evenement.detail;
    const itemActif = document.querySelector('.conversation-item--active');
    const listeActuelle = document.querySelector('.conversations__liste');
    if (itemActif) {
      const apercu = itemActif.querySelector('.conversation-item__apercu');
      const elementHeure = itemActif.querySelector('.conversation-item__heure');
      if (apercu) {
        apercu.textContent = estEnvoye ? `Vous : ${texte}` : texte;
      }
      if (elementHeure) {
        elementHeure.textContent = "À l'instant";
      }
      if (listeActuelle) {
        listeActuelle.prepend(itemActif);
      }
    }
  });
}

// Initialisation au chargement du module
attacherEcouteurs();
initialiserSalonsSupabase();
mettreAJourCompteur();
