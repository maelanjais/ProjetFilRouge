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
import { recupererTousLesSalons, creerSalonSupabase } from '../donnees/salons.js';
import { recupererSession } from '../donnees/authentification.js';
import { recupererUtilisateurConnecte } from '../donnees/profils.js';

let canalTempsReelActif = null;

// Renvoie le nom de la conversation active.
export function recupererNomConversationActive() {
  const itemActif = document.querySelector('.conversation-item--active');
  if (!itemActif) return 'Général';
  const elementNom = itemActif.querySelector('.conversation-item__nom');
  return elementNom ? elementNom.textContent.trim() : 'Général';
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

  const utilisateur = await recupererUtilisateurConnecte();
  const pseudoActuel = utilisateur?.pseudo ?? '';
  const userIdActuel = utilisateur?.id ?? null;

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

  const salonId = elementItem.dataset.salonId || 1;
  const elementNom = elementItem.querySelector('.conversation-item__nom');
  const nom = elementNom ? elementNom.textContent.trim() : 'Général';

  chargerSalonSupabase(Number(salonId), nom);
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
        <p class="conversation-item__apercu">Salon Supabase</p>
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
      // Remplacer les placeholders statiques par les vrais salons Supabase
      listeConversations.replaceChildren();

      const premierSalon = salons[0];

      salons.forEach((salon) => {
        const estPremier = (salon.id === premierSalon.id);
        const el = creerElementSalon(salon, estPremier);
        listeConversations.appendChild(el);
      });

      // Charger les messages du premier salon Supabase
      chargerSalonSupabase(premierSalon.id, premierSalon.nom);
      mettreAJourCompteur();
    }
  } catch (err) {
    console.warn('Impossible de charger les salons Supabase :', err);
  }
}

// Ouvre ou crée un salon pour un contact donné
export async function ouvrirConversationAvecContact(nomContact) {
  const listeConversations = document.querySelector('.conversations__liste');
  if (!listeConversations) return;

  // Vérifier si un salon existe déjà pour ce contact
  const items = document.querySelectorAll('.conversations__liste .conversation-item');
  for (const item of items) {
    const elNom = item.querySelector('.conversation-item__nom');
    if (elNom && elNom.textContent.trim().toLowerCase() === nomContact.toLowerCase()) {
      activerConversation(item);
      return;
    }
  }

  // Sinon, créer un salon Supabase pour ce contact
  try {
    const { data } = await recupererSession();
    const userId = data?.session?.user?.id || null;
    const { data: nouveauSalon, error } = await creerSalonSupabase(nomContact, userId);

    if (!error && nouveauSalon && nouveauSalon[0]) {
      const salon = nouveauSalon[0];
      const el = creerElementSalon(salon, true);
      listeConversations.prepend(el);
      activerConversation(el);
      mettreAJourCompteur();
      return;
    }
  } catch (e) {
    console.warn(e);
  }

  // Fallback si erreur : créer l'élément visuel
  const el = creerElementSalon({ id: 1, nom: nomContact }, true);
  listeConversations.prepend(el);
  activerConversation(el);
  mettreAJourCompteur();
}

// ---- Branchement immédiat des écouteurs d'événements ----

function attacherEcouteurs() {
  const liste = document.querySelector('.conversations__liste');
  const champRecherche = document.getElementById('champ-recherche');
  const panneauContactsListe = document.getElementById('liste-panneau-contact');

  // 1. Clic sur une conversation dans la liste
  if (liste) {
    liste.addEventListener('click', (evenement) => {
      const item = evenement.target.closest('.conversation-item');
      if (item) {
        activerConversation(item);
      }
    });
  }

  // 2. Recherche en direct dans les conversations
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

  // 3. Clic sur un contact dans le panneau latéral (délégation d'événements dynamique)
  if (panneauContactsListe) {
    panneauContactsListe.addEventListener('click', (evenement) => {
      const item = evenement.target.closest('.panneau-contacts__item');
      if (!item) return;

      const nom = item.textContent.trim();
      if (!nom || nom.includes('Aucun contact') || nom.includes('Impossible')) return;

      ouvrirConversationAvecContact(nom);
      fermerContacts();
    });
  }

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
