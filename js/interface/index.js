// index.js - gère la déconnexion de l'utilisateur et le contrôle d'accès
// à la page de messagerie.
import { deconnecterUtilisateur, recupererSession } from '../donnees/authentification.js';
import { afficherErreur } from './utils.js';

// ---- Éléments du DOM ----
const lienDeconnexion = document.getElementById('lien-deconnexion');

// Redirige vers la page de connexion si aucun utilisateur n'est connecté.
async function verifierUtilisateurConnecte() {
  const { data, error } = await recupererSession();
  if (error || !data.session) {
    window.location.replace('connexion.html');
    return;
  }
  document.body.classList.add('session-verifiee');
}

// Déconnecte l'utilisateur puis le renvoie vers la page de connexion.
// Le lien garde son href pour fonctionner même si le JS ne se charge pas.
async function gererDeconnexion(evenement) {
  evenement.preventDefault();
  const { error } = await deconnecterUtilisateur();
  if (error) {
    afficherErreur('Déconnexion impossible, réessayez.');
    return;
  }
  window.location.href = 'connexion.html';
}

// ---- Branchement des événements ----
lienDeconnexion.addEventListener('click', gererDeconnexion);

verifierUtilisateurConnecte();
