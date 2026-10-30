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
function afficherLigneContact(texte) {
  const ligne = document.createElement('li');
  ligne.className = 'panneau-contacts__item';
  ligne.textContent = texte;
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

  const pseudos = contacts.map((ligne) => ligne.contact.nom_utilisateur);
  pseudos.sort((a, b) => a.localeCompare(b));
  for (const pseudo of pseudos) {
    afficherLigneContact(pseudo);
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
