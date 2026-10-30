// parametres.js — ouverture, fermeture et enregistrement du panneau latéral
// des paramètres de la page de messagerie.

import { changerPseudoProfil } from '../donnees/profils.js';
import { recupererSession } from '../donnees/authentification.js';
import { afficherErreur } from './utils.js';

// Messages pour les refus de la base lors d'un changement de pseudo.
const MESSAGES_ERREUR_PSEUDO = {
  23505: 'Ce pseudo est déjà pris.',
  23514: 'Le pseudo doit contenir entre 3 et 30 caractères.',
};

// ---- Éléments du DOM ----
const boutonOuvrirParametres = document.getElementById('bouton-ouvrir-parametres');
const boutonFermerParametres = document.getElementById('bouton-fermer-parametres');
const panneauParametres = document.getElementById('panneau-parametres');
const voileParametres = document.getElementById('voile-parametres');
const formulaireParametres = document.getElementById('formulaire-parametres');
const champPseudo = document.getElementById('param-pseudo');
const caseModeSombre = document.getElementById('case-mode-sombre');

// Classe CSS qui rend visibles le panneau et le voile (voir css/index.css).
const CLASSE_ACTIF = 'actif';

// Affiche le panneau des paramètres et le voile d'arrière-plan.
export function ouvrirParametres() {
  panneauParametres.classList.add(CLASSE_ACTIF);
  voileParametres.classList.add(CLASSE_ACTIF);
}

// Masque le panneau des paramètres et le voile d'arrière-plan.
export function fermerParametres() {
  panneauParametres.classList.remove(CLASSE_ACTIF);
  voileParametres.classList.remove(CLASSE_ACTIF);
}

// Ferme le panneau avec la touche Échap, pour la navigation au clavier.
function fermerParametresAvecEchap(evenement) {
  if (evenement.key === 'Escape' && panneauParametres.classList.contains(CLASSE_ACTIF)) {
    fermerParametres();
  }
}

// Bascule le mode sombre selon la case à cocher
function basculerModeSombre(actif) {
  if (actif) {
    document.body.classList.add('theme-sombre');
    localStorage.setItem('messagerie-theme', 'sombre');
  } else {
    document.body.classList.remove('theme-sombre');
    localStorage.setItem('messagerie-theme', 'clair');
  }
}

// Initialise le thème stocké
function initialiserTheme() {
  const themePrefere = localStorage.getItem('messagerie-theme');
  if (themePrefere === 'sombre') {
    if (caseModeSombre) caseModeSombre.checked = true;
    document.body.classList.add('theme-sombre');
  }
}

// Enregistre le nouveau pseudo dans la base puis l'affiche dans la page.
async function enregistrerParametres(evenement) {
  evenement.preventDefault();
  const nouveauPseudo = champPseudo.value.trim();
  if (!nouveauPseudo) {
    afficherErreur('Le pseudo ne peut pas être vide.');
    return;
  }

  const { data } = await recupererSession();
  const { error } = await changerPseudoProfil(data.session?.user.id, nouveauPseudo);
  if (error) {
    afficherErreur(MESSAGES_ERREUR_PSEUDO[error.code] ?? 'Enregistrement impossible, réessayez.');
    return;
  }

  document.querySelector('.entete-profil__nom').textContent = nouveauPseudo;
  document.querySelector('.profil-apercu__nom').textContent = nouveauPseudo;
  fermerParametres();
}


// ---- Branchement des événements ----
boutonOuvrirParametres.addEventListener('click', ouvrirParametres);
boutonFermerParametres.addEventListener('click', fermerParametres);
voileParametres.addEventListener('click', fermerParametres);
formulaireParametres.addEventListener('submit', enregistrerParametres);
document.addEventListener('keydown', fermerParametresAvecEchap);

if (caseModeSombre) {
  caseModeSombre.addEventListener('change', () => {
    basculerModeSombre(caseModeSombre.checked);
  });
}

initialiserTheme();
