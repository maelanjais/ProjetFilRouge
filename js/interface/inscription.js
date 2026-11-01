// inscription.js - gère le formulaire d'inscription : validation et affichage du résultat.
import { inscrireUtilisateur } from '../donnees/authentification.js';
import { trouverProfilParPseudo } from '../donnees/profils.js';
import { afficherErreur, traduireErreurAuth } from './utils.js';

const formulaire = document.querySelector('.formulaire-auth');
const LONGUEUR_MIN_MOT_DE_PASSE = 8;

formulaire.addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  const courriel = document.getElementById('courriel').value.trim();
  const motDePasse = document.getElementById('mot-de-passe').value;
  const nomUtilisateur = document.getElementById('nom-utilisateur').value.trim();
  const confirmationMotDePasse = document.getElementById('confirmation-mot-de-passe').value;

  const erreurValidationInscription = validerInscription(
    nomUtilisateur, courriel, motDePasse, confirmationMotDePasse);

  if (erreurValidationInscription) {
    afficherErreur(erreurValidationInscription);
    return;
  }

  // Vérifie si le pseudo est déjà pris avant l'inscription.
  const { data: profilExistant } = await trouverProfilParPseudo(nomUtilisateur);
  if (profilExistant) {
    afficherErreur('Ce pseudo est déjà pris.');
    return;
  }

  const { error: erreurInscription } = await inscrireUtilisateur(
    courriel, motDePasse, nomUtilisateur);

  if (erreurInscription) {
    afficherErreur(traduireErreurAuth(erreurInscription));
    return;
  }
  window.location.href = 'index.html';
});

// Vérifie les champs du formulaire, renvoie le message de la première erreur, ou null.
function validerInscription(nomUtilisateur, courriel, motDePasse, confirmationMotDePasse) {
  if (!nomUtilisateur || !courriel || !motDePasse || !confirmationMotDePasse) {
    return 'Tous les champs sont obligatoires.';
  }
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    return `Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`;
  }
  if (motDePasse !== confirmationMotDePasse) {
    return 'Les mots de passe ne correspondent pas.';
  }
  return null;
}
