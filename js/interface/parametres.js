// parametres.js — ouverture, fermeture et enregistrement du panneau latéral
// des paramètres de la page de messagerie.

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

// Enregistre les paramètres sans recharger la page.
function enregistrerParametres(evenement) {
  evenement.preventDefault();

  if (champPseudo) {
    const nouveauPseudo = champPseudo.value.trim();
    if (nouveauPseudo) {
      // Mettre à jour l'en-tête du profil
      const enteteNom = document.querySelector('.entete-profil__nom');
      if (enteteNom) enteteNom.textContent = nouveauPseudo;

      const apercuNom = document.querySelector('.profil-apercu__nom');
      if (apercuNom) apercuNom.textContent = nouveauPseudo;

      // Mettre à jour les initiales
      const initiales = nouveauPseudo.slice(0, 2).toUpperCase();
      document.querySelectorAll('.entete-profil .avatar, .profil-apercu .avatar').forEach((av) => {
        av.textContent = initiales;
      });
    }
  }

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
