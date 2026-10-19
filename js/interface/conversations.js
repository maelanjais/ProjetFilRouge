// conversations.js — gestion de la liste des conversations :
// sélection, recherche, synchronisation avec les contacts et aperçus.

import {
  chargerHistoriqueMessages,
  mettreAJourEnteteDiscussion,
  formaterHeureCourante,
} from './discussion.js';
import { fermerContacts } from './contacts.js';

// ---- Éléments du DOM ----
const listeConversations = document.querySelector('.conversations__liste');
const champRecherche = document.getElementById('champ-recherche');
const compteurConversations = document.querySelector('.conversations__compteur');
const itemsContacts = document.querySelectorAll('.panneau-contacts__item');

// Historique des messages par contact (données initiales en mémoire)
const historiqueConversations = {
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
    { texte: 'Sauvegarde terminée', estEnvoye: false, heure: 'Hier' },
  ],
  'Babouche': [
    { texte: 'Regarde les photos de la rando !', estEnvoye: false, heure: 'Lun.' },
    { texte: 'Photo', estEnvoye: false, heure: 'Lun.' },
  ],
  'Thomas': [
    { texte: 'Est-ce que tu peux valider les maquettes ?', estEnvoye: false, heure: '3 j' },
    { texte: 'noté, merci', estEnvoye: true, heure: '3 j' },
  ],
};

// Renvoie le nom de la conversation active.
export function recupererNomConversationActive() {
  const itemActif = document.querySelector('.conversation-item--active');
  if (!itemActif) return 'Mbappé';
  const elementNom = itemActif.querySelector('.conversation-item__nom');
  return elementNom ? elementNom.textContent.trim() : 'Mbappé';
}

// Met à jour le compteur de conversations visibles dans l'en-tête de la liste.
function mettreAJourCompteur() {
  if (!compteurConversations || !listeConversations) return;
  const visibles = listeConversations.querySelectorAll('.conversation-item:not(.masque)');
  compteurConversations.textContent = visibles.length;
}

// Active une conversation sélectionnée et charge ses messages.
export function activerConversation(elementItem) {
  if (!elementItem) return;

  // Mise à jour de la classe active
  const ancienActif = document.querySelector('.conversation-item--active');
  if (ancienActif) {
    ancienActif.classList.remove('conversation-item--active');
  }
  elementItem.classList.add('conversation-item--active');

  // Supprimer le badge de messages non lus si présent
  const badgeNonLu = elementItem.querySelector('.badge-non-lu');
  if (badgeNonLu) {
    badgeNonLu.remove();
  }

  // Récupérer le nom et l'avatar du contact
  const elementNom = elementItem.querySelector('.conversation-item__nom');
  const nom = elementNom ? elementNom.textContent.trim() : '';

  const elementAvatar = elementItem.querySelector('.avatar');
  const initiales = elementAvatar ? elementAvatar.textContent.trim() : nom.slice(0, 2).toUpperCase();
  const classesAvatar = elementAvatar ? elementAvatar.className.replace('avatar', '').trim() : '';

  // Mettre à jour l'en-tête de la discussion
  mettreAJourEnteteDiscussion(nom, initiales, classesAvatar);

  // Charger les messages du contact
  const messages = historiqueConversations[nom] || [];
  chargerHistoriqueMessages(messages);
}

// Crée un nouvel élément de conversation dans la liste s'il n'existe pas encore.
function creerElementConversation(nom, initiales = '', classeAvatar = '') {
  const init = initiales || nom.slice(0, 2).toUpperCase();
  const li = document.createElement('li');
  li.className = 'conversation-item';
  li.innerHTML = `
    <span class="avatar ${classeAvatar}">${init}</span>
    <div class="conversation-item__contenu">
      <div class="conversation-item__ligne">
        <span class="conversation-item__nom">${nom}</span>
        <span class="conversation-item__heure">À l'instant</span>
      </div>
      <div class="conversation-item__ligne">
        <p class="conversation-item__apercu">Nouvelle conversation</p>
      </div>
    </div>
  `;
  return li;
}

// Ouvre la conversation avec un contact donné (crée l'entrée si nécessaire).
export function ouvrirConversationAvecContact(nom, initiales = '', classeAvatar = '') {
  const items = document.querySelectorAll('.conversation-item');
  let itemTrouve = null;

  items.forEach((item) => {
    const elNom = item.querySelector('.conversation-item__nom');
    if (elNom && elNom.textContent.trim().toLowerCase() === nom.toLowerCase()) {
      itemTrouve = item;
    }
  });

  if (!itemTrouve) {
    itemTrouve = creerElementConversation(nom, initiales, classeAvatar);
    if (!historiqueConversations[nom]) {
      historiqueConversations[nom] = [];
    }
    listeConversations.prepend(itemTrouve);
    mettreAJourCompteur();
  }

  activerConversation(itemTrouve);
}

// ---- Écouteurs d'événements ----

// 1. Clic sur une conversation dans la liste
if (listeConversations) {
  listeConversations.addEventListener('click', (evenement) => {
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
    const items = listeConversations.querySelectorAll('.conversation-item');

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

// 3. Clic sur un contact dans le panneau latéral des contacts
itemsContacts.forEach((itemContact) => {
  itemContact.addEventListener('click', () => {
    const elNom = itemContact.querySelector('.panneau-contacts__nom');
    const elAvatar = itemContact.querySelector('.avatar');
    if (!elNom) return;

    const nom = elNom.textContent.trim();
    const initiales = elAvatar ? elAvatar.textContent.trim() : '';
    const classeAvatar = elAvatar ? elAvatar.className.replace('avatar', '').trim() : '';

    ouvrirConversationAvecContact(nom, initiales, classeAvatar);
    fermerContacts();
  });
});

// 4. Synchronisation avec l'envoi de messages
document.addEventListener('message-ajoute', (evenement) => {
  const { texte, heure, estEnvoye } = evenement.detail;
  const nomActif = recupererNomConversationActive();

  // Enregistrer dans l'historique
  if (!historiqueConversations[nomActif]) {
    historiqueConversations[nomActif] = [];
  }
  historiqueConversations[nomActif].push({ texte, heure, estEnvoye });

  // Mettre à jour l'aperçu dans l'élément actif
  const itemActif = document.querySelector('.conversation-item--active');
  if (itemActif) {
    const apercu = itemActif.querySelector('.conversation-item__apercu');
    const elementHeure = itemActif.querySelector('.conversation-item__heure');
    if (apercu) {
      apercu.textContent = estEnvoye ? `Vous : ${texte}` : texte;
    }
    if (elementHeure) {
      elementHeure.textContent = 'À l'instant';
    }
    // Remonter la conversation active en haut de la liste
    listeConversations.prepend(itemActif);
  }
});

// Initialiser le compteur au chargement
mettreAJourCompteur();
