// recherche-contact.js — ouverture de la fenêtre de recherche d'un utilisateur
// à ajouter aux contacts.

import { rechercherProfils } from '../donnees/profils.js';
import { recupererSession } from '../donnees/authentification.js';

// ---- Éléments du DOM ----
const boutonAjouterContact = document.getElementById('bouton-ajouter-contact');
const fenetreRecherche = document.getElementById('fenetre-recherche-contact');
const champRecherche = document.getElementById('champ-recherche-contact');
const listeResultats = document.getElementById('resultats-recherche-contact');

// id de l'utilisateur connecté, lu à l'ouverture de la fenêtre pour l'exclure
// des résultats de recherche.
let idUtilisateurConnecte = null;

// Ouvre la fenêtre au centre de l'écran et place le curseur dans le champ.
async function ouvrirRechercheContact() {
  fenetreRecherche.showModal();
  champRecherche.focus();
  const { data } = await recupererSession();
  idUtilisateurConnecte = data.session?.user.id ?? null;
}

// Ferme la fenêtre si on clique sur le voile
function fermerRechercheSurVoile(evenement) {
  if (evenement.target === fenetreRecherche) {
    fenetreRecherche.close();
  }
}

// Affiche les profils trouvés dans la liste, ou un message s'il n'y en a aucun.
function afficherProfilsTrouves(profils) {
  listeResultats.replaceChildren();
  if (profils.length === 0) {
    ajouterLigneResultat('Aucun utilisateur trouvé.');
    return;
  }
  for (const profil of profils) {
    ajouterLigneResultat(profil.nom_utilisateur);
  }
}

// Ajoute une ligne de texte à la liste des résultats.
function ajouterLigneResultat(texte) {
  const ligne = document.createElement('li');
  ligne.className = 'recherche-contact__resultat';
  ligne.textContent = texte;
  listeResultats.append(ligne);
}

// Lance la recherche à chaque frappe et affiche les résultats ou l'erreur.
async function afficherResultatsRecherche() {
  const texte = champRecherche.value.trim();
  if (!texte) {
    listeResultats.replaceChildren();
    return;
  }
  const { data: profils, error: erreurRecherche } =
    await rechercherProfils(texte, idUtilisateurConnecte);
  if (erreurRecherche) {
    listeResultats.replaceChildren();
    ajouterLigneResultat('Recherche impossible, réessayez.');
    return;
  }
  afficherProfilsTrouves(profils);
}

// ---- Branchement des événements ----
boutonAjouterContact.addEventListener('click', ouvrirRechercheContact);
fenetreRecherche.addEventListener('click', fermerRechercheSurVoile);
champRecherche.addEventListener('input', afficherResultatsRecherche);
