// recherche-contact.js — ouverture de la fenêtre de recherche d'un utilisateur
// à ajouter aux contacts.

import { rechercherProfils } from '../donnees/profils.js';
import { recupererSession } from '../donnees/authentification.js';
import { ajouterContact, recupererIdsContacts } from '../donnees/contacts.js';


// ---- Éléments du DOM ----
const boutonAjouterContact = document.getElementById('bouton-ajouter-contact');
const fenetreRecherche = document.getElementById('fenetre-recherche-contact');
const champRecherche = document.getElementById('champ-recherche-contact');
const listeResultats = document.getElementById('resultats-recherche-contact');

// id de l'utilisateur connecté, lu à l'ouverture de la fenêtre pour l'exclure
// des résultats de recherche.
let idUtilisateurConnecte = null;

// id des contacts déjà ajoutés, chargés à l'ouverture de la fenêtre pour
// désactiver leur bouton « Ajouter » dans les résultats.
let idsContacts = new Set();

// Ouvre la fenêtre au centre de l'écran et place le curseur dans le champ.
async function ouvrirRechercheContact() {
  fenetreRecherche.showModal();
  champRecherche.focus();
  const { data } = await recupererSession();
  idUtilisateurConnecte = data.session?.user.id ?? null;
  await chargerIdsContacts();
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
    ajouterLigneProfil(profil);
  }
}

// Ajoute une ligne de texte (message d'information ou d'erreur) à la liste.
function ajouterLigneResultat(texte) {
  const ligne = document.createElement('li');
  ligne.className = 'recherche-contact__resultat';
  ligne.textContent = texte;
  listeResultats.append(ligne);
}

// Ajoute une ligne avec le pseudo du profil et un bouton pour l'ajouter aux contacts.
function ajouterLigneProfil(profil) {
  const ligne = document.createElement('li');
  ligne.className = 'recherche-contact__resultat';

  const nom = document.createElement('span');
  nom.className = 'recherche-contact__nom';
  nom.textContent = profil.nom_utilisateur;

  const contactDejaAjoute = idsContacts.has(profil.id);

  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'recherche-contact__bouton-ajouter';
  if (contactDejaAjoute) {
    bouton.textContent = 'Déjà ajouté';
    bouton.disabled = true;
  } else {
    bouton.textContent = 'Ajouter';
  }
  bouton.addEventListener('click', () => ajouterProfilAuxContacts(profil.id, bouton));

  ligne.append(nom, bouton);
  listeResultats.append(ligne);
}

// Remplit idsContacts avec les contacts de l'utilisateur connecté.
async function chargerIdsContacts() {
  const { data: contacts, error } = await recupererIdsContacts(idUtilisateurConnecte);
  if (error) {
    idsContacts = new Set();
    return;
  }
  idsContacts = new Set(contacts.map((contact) => contact.contact_id));
}

// Enregistre le profil comme contact et indique le résultat sur le bouton.
async function ajouterProfilAuxContacts(idContact, bouton) {
  bouton.disabled = true;
  const { error } = await ajouterContact(idUtilisateurConnecte, idContact);
  if (error) {
    // 23505 = violation de clé unique : ce contact est déjà dans la liste.
    bouton.textContent = error.code === '23505' ? 'Déjà ajouté' : 'Erreur, réessayer';
    bouton.disabled = error.code === '23505';
    return;
  }
  idsContacts.add(idContact);
  bouton.textContent = 'Ajouté';
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
