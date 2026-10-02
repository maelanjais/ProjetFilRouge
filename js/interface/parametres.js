// parametres.js — ouverture, fermeture et enregistrement du panneau latéral
// des paramètres de la page de messagerie.

// ---- Éléments du DOM ----
const boutonOuvrirParametres = document.getElementById('bouton-ouvrir-parametres');
const boutonFermerParametres = document.getElementById('bouton-fermer-parametres');
const panneauParametres = document.getElementById('panneau-parametres');
const voileParametres = document.getElementById('voile-parametres');
const formulaireParametres = document.getElementById('formulaire-parametres');

// Classe CSS qui rend visibles le panneau et le voile (voir css/index.css).
const CLASSE_ACTIF = 'actif';

// Affiche le panneau des paramètres et le voile d'arrière-plan.
function ouvrirParametres() {
  panneauParametres.classList.add(CLASSE_ACTIF);
  voileParametres.classList.add(CLASSE_ACTIF);
}

// Masque le panneau des paramètres et le voile d'arrière-plan.
function fermerParametres() {
  panneauParametres.classList.remove(CLASSE_ACTIF);
  voileParametres.classList.remove(CLASSE_ACTIF);
}

// Ferme le panneau avec la touche Échap, pour la navigation au clavier.
function fermerParametresAvecEchap(evenement) {
  if (evenement.key === 'Escape' && panneauParametres.classList.contains(CLASSE_ACTIF)) {
    fermerParametres();
  }
}

// Enregistre les paramètres sans recharger la page.
function enregistrerParametres(evenement) {
  evenement.preventDefault();
  fermerParametres();
}

// ---- Branchement des événements ----
boutonOuvrirParametres.addEventListener('click', ouvrirParametres);
boutonFermerParametres.addEventListener('click', fermerParametres);
voileParametres.addEventListener('click', fermerParametres);
formulaireParametres.addEventListener('submit', enregistrerParametres);
document.addEventListener('keydown', fermerParametresAvecEchap);
