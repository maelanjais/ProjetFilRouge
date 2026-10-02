// contacts.js — ouverture et fermeture du panneau latéral de la liste
// des contacts de la page de messagerie.

// ---- Éléments du DOM ----
const boutonOuvrirContacts = document.getElementById('bouton-ouvrir-contacts');
const boutonFermerContacts = document.getElementById('bouton-fermer-contacts');
const panneauContacts = document.getElementById('panneau-contacts');
const voileContacts = document.getElementById('voile-contacts');

// Classe CSS qui rend visibles le panneau et le voile (voir css/index.css).
const CLASSE_ACTIF = 'actif';

// Affiche le panneau des contacts et le voile d'arrière-plan.
function ouvrirContacts() {
  panneauContacts.classList.add(CLASSE_ACTIF);
  voileContacts.classList.add(CLASSE_ACTIF);
}

// Masque le panneau des contacts et le voile d'arrière-plan.
function fermerContacts() {
  panneauContacts.classList.remove(CLASSE_ACTIF);
  voileContacts.classList.remove(CLASSE_ACTIF);
}

// Ferme le panneau avec la touche Échap, pour la navigation au clavier.
function fermerContactsAvecEchap(evenement) {
  if (evenement.key === 'Escape' && panneauContacts.classList.contains(CLASSE_ACTIF)) {
    fermerContacts();
  }
}

// ---- Branchement des événements ----
boutonOuvrirContacts.addEventListener('click', ouvrirContacts);
boutonFermerContacts.addEventListener('click', fermerContacts);
voileContacts.addEventListener('click', fermerContacts);
document.addEventListener('keydown', fermerContactsAvecEchap);
