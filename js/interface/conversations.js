// conversations.js — gestion de la liste des conversations et des salons Supabase :
// sélection, recherche, synchronisation temps réel et contacts.

import {
  chargerHistoriqueMessages,
  mettreAJourEnteteDiscussion,
  formaterHeureCourante,
  ajouterMessage,
  afficherAvisDiscussion,
  definirSalonActif,
} from './discussion.js';
import { fermerContacts } from './contacts.js';
import {
  recupererMessagesParSalon,
  ecouterNouveauxMessages,
  arreterEcouteTempsReel,
  recupererDerniersMessages,
} from '../donnees/messages.js';
import {
  recupererSalonsUtilisateur,
  trouverSalonEntre,
  creerSalon,
} from '../donnees/salons.js';
import { recupererUtilisateurConnecte } from '../donnees/profils.js';
import { creerElement } from './utils.js';

let canalTempsReelActif = null;

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
  definirSalonActif(salonId);

  if (canalTempsReelActif) {
    arreterEcouteTempsReel(canalTempsReelActif);
    canalTempsReelActif = null;
  }

  const utilisateur = await recupererUtilisateurConnecte();
  const pseudoActuel = utilisateur?.pseudo ?? '';
  const userIdActuel = utilisateur?.id ?? null;

  mettreAJourEnteteDiscussion(nomSalon);

  // Chargement des messages depuis Supabase
  const { data: messages, error } = await recupererMessagesParSalon(salonId);
  if (error) {
    chargerHistoriqueMessages([]);
    afficherAvisDiscussion('Impossible de charger les messages, rechargez la page.');
  } else {
    const messagesFormates = messages.map((m) => {
      const estEnvoye = (userIdActuel && m.auteur_id === userIdActuel)
        || (pseudoActuel && m.auteur_pseudo === pseudoActuel);
      return {
        texte: m.contenu || '',
        estEnvoye,
        auteurPseudo: m.auteur_pseudo || 'Membre',
        heure: formaterHeureCourante(m.date_creation),
        date: m.date_creation,
      };
    });
    chargerHistoriqueMessages(messagesFormates);
  }

  // Écoute des nouveaux messages en temps réel
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

  const salonId = Number(elementItem.dataset.salonId);
  const elementNom = elementItem.querySelector('.conversation-item__nom');
  const nom = elementNom ? elementNom.textContent.trim() : '';

  chargerSalonSupabase(salonId, nom);
}

// Renvoie le pseudo de l'autre participant du salon : chacun voit le nom de son
// interlocuteur, quel que soit celui qui a créé la conversation.
function recupererNomInterlocuteur(salon, idUtilisateur) {
  const profilInterlocuteur = salon.cree_par === idUtilisateur
    ? salon.participant
    : salon.createur;
  return profilInterlocuteur?.nom_utilisateur ?? 'Utilisateur supprimé';
}

// Crée l'élément de liste d'un salon. Le nom passe par textContent (jamais
// innerHTML) car c'est un pseudo choisi par un utilisateur.
function creerElementSalon(salon, nom) {
  const li = creerElement('li', 'conversation-item');
  li.dataset.salonId = salon.id;

  const ligneNom = creerElement('div', 'conversation-item__ligne');
  ligneNom.append(
    creerElement('span', 'conversation-item__nom', nom),
    creerElement('span', 'conversation-item__heure'),
  );

  const ligneApercu = creerElement('div', 'conversation-item__ligne');
  ligneApercu.append(creerElement('p', 'conversation-item__apercu'));

  const contenu = creerElement('div', 'conversation-item__contenu');
  contenu.append(ligneNom, ligneApercu);
  li.append(contenu);
  return li;
}

// Remplit l'aperçu et l'heure de chaque conversation avec le dernier message
// (vue derniers_messages).
function afficherApercus(derniersMessages, idUtilisateur) {
  for (const message of derniersMessages) {
    const element = document.querySelector(`[data-salon-id="${message.salon_id}"]`);
    if (!element) continue;

    const apercu = element.querySelector('.conversation-item__apercu');
    const elementHeure = element.querySelector('.conversation-item__heure');
    apercu.textContent = message.auteur_id === idUtilisateur
      ? `Vous : ${message.contenu}`
      : message.contenu;
    elementHeure.textContent = formaterHeureCourante(message.date_creation);
  }
}

// Affiche les salons de l'utilisateur connecté et ouvre le premier.
async function initialiserSalonsSupabase() {
  const listeConversations = document.querySelector('.conversations__liste');
  if (!listeConversations) return;

  const utilisateur = await recupererUtilisateurConnecte();
  if (!utilisateur) return;

  const { data: salons, error } = await recupererSalonsUtilisateur(utilisateur.id);
  listeConversations.replaceChildren();
  if (error) {
    mettreAJourEnteteDiscussion('Impossible de charger les conversations');
    return;
  }

  for (const salon of salons) {
    const nom = recupererNomInterlocuteur(salon, utilisateur.id);
    listeConversations.append(creerElementSalon(salon, nom));
  }

  const idsSalons = salons.map((salon) => salon.id);
  const { data: derniersMessages, error: erreurApercus } =
    await recupererDerniersMessages(idsSalons);
  if (!erreurApercus) {
    afficherApercus(derniersMessages, utilisateur.id);
  }

  mettreAJourCompteur();

  const premierElement = listeConversations.querySelector('.conversation-item');
  if (premierElement) {
    activerConversation(premierElement);
  }
}

// Ouvre la conversation avec un contact : réutilise le salon existant entre les
// deux utilisateurs s'il y en a un, sinon le crée.
export async function ouvrirConversationAvecContact(idContact, nomContact) {
  const listeConversations = document.querySelector('.conversations__liste');
  const utilisateur = await recupererUtilisateurConnecte();
  if (!listeConversations || !utilisateur) return;

  const { data: salonExistant, error: erreurRecherche } =
    await trouverSalonEntre(utilisateur.id, idContact);
  if (erreurRecherche) {
    mettreAJourEnteteDiscussion('Impossible d\'ouvrir la conversation');
    return;
  }

  let salon = salonExistant;
  if (!salon) {
    const { data: nouveauSalon, error: erreurCreation } =
      await creerSalon(utilisateur.id, idContact);
    if (erreurCreation) {
      mettreAJourEnteteDiscussion('Impossible d\'ouvrir la conversation');
      return;
    }
    salon = nouveauSalon;
  }

  let element = listeConversations.querySelector(`[data-salon-id="${salon.id}"]`);
  if (!element) {
    element = creerElementSalon(salon, nomContact);
    listeConversations.prepend(element);
    mettreAJourCompteur();
  }
  activerConversation(element);
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
      // Seules les lignes de contact ont un data-contact-id (pas les messages
      // « Aucun contact… » ou « Impossible… »).
      const item = evenement.target.closest('.panneau-contacts__item');
      if (!item?.dataset.contactId) return;

      ouvrirConversationAvecContact(item.dataset.contactId, item.textContent.trim());
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
