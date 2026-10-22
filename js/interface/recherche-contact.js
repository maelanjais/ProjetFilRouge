// recherche-contact.js — ouverture de la fenêtre de recherche d'un utilisateur
// à ajouter aux contacts.

// ---- Éléments du DOM ----
const boutonAjouterContact = document.getElementById('bouton-ajouter-contact');
const fenetreRecherche = document.getElementById('fenetre-recherche-contact');
const champRecherche = document.getElementById('champ-recherche-contact');

// Ouvre la fenêtre au centre de l'écran et place le curseur dans le champ.
function ouvrirRechercheContact() {
  fenetreRecherche.showModal();
  champRecherche.focus();
}

// Ferme la fenêtre si on clique sur le voile
function fermerRechercheSurVoile(evenement) {
  if (evenement.target === fenetreRecherche) {
    fenetreRecherche.close();
  }
}

// ---- Branchement des événements ----
boutonAjouterContact.addEventListener('click', ouvrirRechercheContact);
fenetreRecherche.addEventListener('click', fermerRechercheSurVoile);
