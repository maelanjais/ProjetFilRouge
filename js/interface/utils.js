// utils.js - affichage des messages d'erreur, partagé entre les pages
// (connexion, inscription, messagerie).

// Messages en français pour les codes d'erreur Supabase Auth les plus courants.
const MESSAGES_ERREUR_AUTH = {
  invalid_credentials: 'Courriel ou mot de passe incorrect.',
  user_already_exists: 'Un compte existe déjà avec ce courriel.',
  weak_password: 'Mot de passe trop faible.',
  email_address_invalid: 'Adresse courriel invalide. Vérifiez le format ou utilisez une adresse valide.',
};

// Renvoie un message compréhensible pour une erreur Supabase ; message d'origine à défaut.
export function traduireErreurAuth(erreur) {
  return MESSAGES_ERREUR_AUTH[erreur.code] ?? erreur.message;
}

// Affiche un message d'erreur dans l'élément #message-erreur de la page.
export function afficherErreur(message) {
  document.getElementById('message-erreur').textContent = message;
}
