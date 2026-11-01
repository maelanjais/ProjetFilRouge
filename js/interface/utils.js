// utils.js - fonctions d'affichage partagées entre les pages (connexion, inscription,
// messagerie) : messages d'erreur et création d'éléments du DOM.

// Messages en français pour les codes d'erreur Supabase Auth les plus courants.
const MESSAGES_ERREUR_AUTH = {
  invalid_credentials: 'Courriel ou mot de passe incorrect.',
  user_already_exists: 'Un compte existe déjà avec ce courriel.',
  weak_password: 'Mot de passe trop faible.',
  email_address_invalid:
    'Adresse courriel invalide. Vérifiez le format ou utilisez une adresse valide.',
  // Erreur générique renvoyée quand le déclencheur de création du profil échoue
  // (« Database error saving new user ») : en pratique, un pseudo déjà pris.
  unexpected_failure: 'Inscription impossible : ce pseudo est peut-être déjà pris.',
};

// Renvoie un message compréhensible pour une erreur Supabase ; message d'origine à défaut.
export function traduireErreurAuth(erreur) {
  return MESSAGES_ERREUR_AUTH[erreur.code] ?? erreur.message;
}

// Affiche un message d'erreur dans l'élément #message-erreur de la page.
export function afficherErreur(message) {
  document.getElementById('message-erreur').textContent = message;
}

// Crée un élément avec sa classe et, si fourni, son texte. Le texte passe par
// textContent.
export function creerElement(balise, classe, texte = '') {
  const element = document.createElement(balise);
  element.className = classe;
  element.textContent = texte;
  return element;
}
