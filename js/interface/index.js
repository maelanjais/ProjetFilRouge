// index.js — gère le contrôle d'accès, la synchronisation du profil utilisateur
// et la déconnexion sur la page de messagerie.

import { deconnecterUtilisateur, recupererSession } from '../donnees/authentification.js';
import { afficherErreur } from './utils.js';
import { recupererPseudo } from '../donnees/profils.js';

// ---- Éléments du DOM ----
const lienDeconnexion = document.getElementById('lien-deconnexion');

// Met à jour l'affichage du profil utilisateur dans l'en-tête et les paramètres.
// Le pseudo est lu dans la table profils, seule source à jour après un changement
// de pseudo ; à défaut, on affiche le début du courriel.
async function afficherProfilUtilisateur(utilisateur) {
  if (!utilisateur) return;

  const { data: profil, error } = await recupererPseudo(utilisateur.id);
  const pseudo = (!error && profil?.nom_utilisateur)
    || utilisateur.email?.split('@')[0]
    || 'Utilisateur';

  // En-tête de l'application
  const enteteNom = document.querySelector('.entete-profil__nom');
  if (enteteNom) enteteNom.textContent = pseudo;

  // Panneau des paramètres
  const apercuNom = document.querySelector('.profil-apercu__nom');
  if (apercuNom) apercuNom.textContent = pseudo;

  const apercuCourriel = document.querySelector('.profil-apercu__courriel');
  if (apercuCourriel && utilisateur.email) {
    apercuCourriel.textContent = utilisateur.email;
  }

  const champPseudo = document.getElementById('param-pseudo');
  if (champPseudo) champPseudo.value = pseudo;
}

// Redirige vers la page de connexion si aucun utilisateur n'est connecté.
async function verifierUtilisateurConnecte() {
  const { data, error } = await recupererSession();
  if (error || !data?.session) {
    window.location.replace('connexion.html');
    return;
  }

  document.body.classList.add('session-verifiee');
  afficherProfilUtilisateur(data.session.user);
}

// Déconnecte l'utilisateur puis le renvoie vers la page de connexion.
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
if (lienDeconnexion) {
  lienDeconnexion.addEventListener('click', gererDeconnexion);
}

verifierUtilisateurConnecte();
