// contacts.js - ouverture et fermeture du panneau latéral de la liste
// et affichage des contacts.

import { recupererContacts } from '../donnees/contacts.js';
import { recupererSession } from '../donnees/authentification.js';

// ---- Éléments du DOM ----
const boutonOuvrirContacts = document.getElementById('bouton-ouvrir-contacts');
const boutonFermerContacts = document.getElementById('bouton-fermer-contacts');
const boutonNouvelleConversation = document.getElementById('bouton-nouvelle-conversation');
const panneauContacts = document.getElementById('panneau-contacts');
const voileContacts = document.getElementById('voile-contacts');
const listeContacts = document.getElementById('liste-panneau-contact');

// Classe CSS qui rend visibles le panneau et le voile (voir css/index.css).
const CLASSE_ACTIF = 'actif';

// id de l'utilisateur connecté, lu au chargement pour récupérer ses contacts
let idUtilisateurConnecte = null;

// Affiche le panneau des contacts et le voile d'arrière-plan.
export function ouvrirContacts() {
  panneauContacts.classList.add(CLASSE_ACTIF);
  voileContacts.classList.add(CLASSE_ACTIF);
}

// Masque le panneau des contacts et le voile d'arrière-plan.
export function fermerContacts() {
  panneauContacts.classList.remove(CLASSE_ACTIF);
  voileContacts.classList.remove(CLASSE_ACTIF);
}

// Ferme le panneau avec la touche Échap, pour la navigation au clavier.
function fermerContactsAvecEchap(evenement) {
  if (evenement.key === 'Escape' && panneauContacts.classList.contains(CLASSE_ACTIF)) {
    fermerContacts();
  }
}

// Ajoute une ligne de texte (pseudo ou message) à la liste des contacts.
// idContact est gardé dans data-contact-id pour ouvrir la conversation au clic.
function afficherLigneContact(texte, idContact = null) {
  const ligne = document.createElement('li');
  ligne.className = 'panneau-contacts__item';
  ligne.textContent = texte;
  if (idContact) {
    ligne.dataset.contactId = idContact;
  }
  listeContacts.append(ligne);
}

// Récupère les contacts de l'utilisateur connecté et les affiche par ordre alphabétique.
export async function initialiserListeContacts() {
  const { data } = await recupererSession();
  idUtilisateurConnecte = data.session?.user.id ?? null;

  const { data: contacts, error: erreurRecuperation } =
    await recupererContacts(idUtilisateurConnecte);

  listeContacts.replaceChildren();
  if (erreurRecuperation) {
    afficherLigneContact('Impossible de charger les contacts.');
    return;
  }
  if (contacts.length === 0) {
    afficherLigneContact('Aucun contact pour le moment.');
    return;
  }

  const profils = contacts.map((ligne) => ligne.contact);
  profils.sort((a, b) => a.nom_utilisateur.localeCompare(b.nom_utilisateur));
  for (const profil of profils) {
    afficherLigneContact(profil.nom_utilisateur, profil.id);
  }
}

// ---- Branchement des événements ----
boutonOuvrirContacts.addEventListener('click', ouvrirContacts);
boutonFermerContacts.addEventListener('click', fermerContacts);
boutonNouvelleConversation.addEventListener('click', ouvrirContacts);
voileContacts.addEventListener('click', fermerContacts);
document.addEventListener('keydown', fermerContactsAvecEchap);

// ---- Appels fonctions ----
initialiserListeContacts();
