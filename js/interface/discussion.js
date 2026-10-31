// discussion.js — gestion de la zone de discussion active :
// envoi de messages texte, messages vocaux (micro), pièces jointes,
// défilement automatique et synchronisation avec Supabase.

import { envoyerMessageSupabase } from '../donnees/messages.js';
import { recupererUtilisateurConnecte } from '../donnees/profils.js';

// ---- Éléments du DOM ----
const conteneurMessages = document.querySelector('.discussion__messages');
const formulaireMessage = document.getElementById('formulaire-message');
const saisieMessage = document.getElementById('saisie-message');
const boutonMicro = document.querySelector('.bouton-micro');
const boutonJoindre = document.querySelector('.bouton-joindre');
const enteteNom = document.querySelector('.discussion__nom');

// Identifiant du salon actif (1 par défaut)
window.salonIdActuel = 1;

// État de l'enregistreur vocal
let mediaRecorder = null;
let morceauxAudio = [];
let estEnregistrementEnCours = false;
let fluxAudio = null;

// Entrée de fichier cachée pour les pièces jointes d'images
const champFichier = document.createElement('input');
champFichier.type = 'file';
champFichier.accept = 'image/*';
champFichier.style.display = 'none';
document.body.appendChild(champFichier);

// Renvoie l'heure actuelle au format HH:MM.
export function formaterHeureCourante(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const heures = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${heures}:${minutes}`;
}

// Fait défiler le conteneur des messages jusqu'au dernier message.
export function defilerEnBas() {
  if (conteneurMessages) {
    conteneurMessages.scrollTop = conteneurMessages.scrollHeight;
  }
}

// Échappe les caractères HTML pour éviter les injections.
function echapperHtml(texte) {
  const p = document.createElement('p');
  p.textContent = texte;
  return p.innerHTML;
}

// Crée et renvoie un élément de message HTML complet.
export function creerElementMessage({
  texte = '',
  audioUrl = '',
  imageUrl = '',
  auteurPseudo = '',
  estEnvoye = true,
  heure = formaterHeureCourante(),
}) {
  const elementMessage = document.createElement('div');
  elementMessage.className = `message ${estEnvoye ? 'message--envoye' : 'message--recu'}`;

  let contenuHtml = '';

  if (!estEnvoye && auteurPseudo) {
    contenuHtml += `<span class="message__auteur" style="font-weight:700;font-size:0.75rem;margin-bottom:2px;display:block;opacity:0.85;">${echapperHtml(auteurPseudo)}</span>`;
  }

  if (texte) {
    contenuHtml += `<p class="message__texte">${echapperHtml(texte)}</p>`;
  }

  if (audioUrl) {
    contenuHtml += `<audio class="message__audio" controls src="${audioUrl}"></audio>`;
  }

  if (imageUrl) {
    contenuHtml += `<img class="message__image" src="${imageUrl}" alt="Pièce jointe">`;
  }

  contenuHtml += `<span class="message__horodatage">${heure}</span>`;

  elementMessage.innerHTML = `<div class="message__bulle">${contenuHtml}</div>`;
  return elementMessage;
}

// Ajoute un message à la discussion active et fait défiler vers le bas.
export function ajouterMessage({
  texte = '',
  audioUrl = '',
  imageUrl = '',
  auteurPseudo = '',
  estEnvoye = true,
  heure = formaterHeureCourante(),
}) {
  if (!conteneurMessages) return;

  const element = creerElementMessage({
    texte, audioUrl, imageUrl, auteurPseudo, estEnvoye, heure,
  });
  conteneurMessages.appendChild(element);
  defilerEnBas();

  const apercuTexte = texte || (audioUrl ? 'Message vocal 🎙️' : 'Photo 📷');
  document.dispatchEvent(new CustomEvent('message-ajoute', {
    detail: {
      texte: apercuTexte,
      estEnvoye,
      heure,
    },
  }));
  return element;
}

// Renvoie le libellé du jour d'une date : « Aujourd'hui », « Hier » ou la date
// complète (« 12 octobre 2026 »). Les dates sont comparées sans l'heure.
function formaterLibelleJour(date) {
  const jour = new Date(date);
  const aujourdHui = new Date();
  const hier = new Date();
  hier.setDate(aujourdHui.getDate() - 1);

  if (jour.toDateString() === aujourdHui.toDateString()) {
    return 'Aujourd\'hui';
  }
  if (jour.toDateString() === hier.toDateString()) {
    return 'Hier';
  }
  return jour.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Crée le séparateur qui annonce le jour des messages qui le suivent.
function creerSeparateurDate(libelle) {
  const separateur = document.createElement('div');
  separateur.className = 'separateur-date';
  const texte = document.createElement('span');
  texte.className = 'separateur-date__texte';
  texte.textContent = libelle;
  separateur.append(texte);
  return separateur;
}

// Remplace les messages affichés par une liste donnée (triée par date croissante).
// Un séparateur est inséré à chaque changement de jour.
export function chargerHistoriqueMessages(listeMessages) {
  if (!conteneurMessages) return;

  conteneurMessages.replaceChildren();
  let libelleJourPrecedent = '';
  for (const message of listeMessages) {
    const libelleJour = formaterLibelleJour(message.date);
    if (libelleJour !== libelleJourPrecedent) {
      conteneurMessages.append(creerSeparateurDate(libelleJour));
      libelleJourPrecedent = libelleJour;
    }
    conteneurMessages.append(creerElementMessage(message));
  }

  defilerEnBas();
}

// Signale dans la bulle qu'un message n'a pas pu être enregistré : il est affiché
// localement mais l'interlocuteur ne le recevra pas.
function signalerEchecEnvoi(elementMessage) {
  elementMessage.classList.add('message--echec');
  const avertissement = document.createElement('span');
  avertissement.className = 'message__echec';
  avertissement.setAttribute('role', 'alert');
  avertissement.textContent = 'Non envoyé, vérifiez votre connexion.';
  elementMessage.querySelector('.message__bulle').append(avertissement);
}

// Ajoute un avis (erreur de chargement, micro indisponible...) à la suite de la
// discussion, à la place des alert() : le message reste lisible dans la page.
export function afficherAvisDiscussion(texte) {
  if (!conteneurMessages) return;
  const avis = document.createElement('p');
  avis.className = 'discussion__avis';
  avis.setAttribute('role', 'alert');
  avis.textContent = texte;
  conteneurMessages.append(avis);
  defilerEnBas();
}

// Met à jour l'en-tête de la discussion avec le nom du contact ou du salon.
export function mettreAJourEnteteDiscussion(nom) {
  if (enteteNom) enteteNom.textContent = nom;
}

// ---- Gestion des événements ----

// 1. Envoi de message texte via le formulaire et synchronisation Supabase
if (formulaireMessage) {
  formulaireMessage.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const texte = saisieMessage.value.trim();
    if (!texte) return;

    saisieMessage.value = '';

    // Pseudo à jour et id de l'utilisateur, pour l'affichage et l'enregistrement
    const utilisateur = await recupererUtilisateurConnecte();
    const pseudo = utilisateur?.pseudo ?? 'Moi';
    const userId = utilisateur?.id ?? null;

    // Affichage local immédiat, signalé en échec si la base refuse le message
    const elementMessage = ajouterMessage({ texte, estEnvoye: true, auteurPseudo: pseudo });

    if (window.salonIdActuel) {
      const { error } = await envoyerMessageSupabase({
        salonId: window.salonIdActuel,
        contenu: texte,
        auteurPseudo: pseudo,
        auteurId: userId,
      });
      if (error) {
        signalerEchecEnvoi(elementMessage);
      }
    }

    saisieMessage.focus();
  });
}

// 2. Enregistrement de message vocal (bouton micro)
if (boutonMicro) {
  boutonMicro.addEventListener('click', async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      afficherAvisDiscussion(
        'L\'enregistrement vocal n\'est pas pris en charge par votre navigateur.');
      return;
    }

    if (estEnregistrementEnCours && mediaRecorder) {
      mediaRecorder.stop();
      return;
    }

    try {
      fluxAudio = await navigator.mediaDevices.getUserMedia({ audio: true });
      morceauxAudio = [];
      mediaRecorder = new MediaRecorder(fluxAudio);

      mediaRecorder.addEventListener('dataavailable', (evenement) => {
        if (evenement.data && evenement.data.size > 0) {
          morceauxAudio.push(evenement.data);
        }
      });

      mediaRecorder.addEventListener('stop', async () => {
        const typeMime = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(morceauxAudio, { type: typeMime });
        const audioUrl = URL.createObjectURL(blob);

        const elementVocal = ajouterMessage({ audioUrl, estEnvoye: true });

        // Synchronisation avec Supabase, signalée en échec si la base refuse
        if (window.salonIdActuel) {
          const utilisateur = await recupererUtilisateurConnecte();
          const { error } = await envoyerMessageSupabase({
            salonId: window.salonIdActuel,
            contenu: '[Message vocal 🎙️]',
            auteurPseudo: utilisateur?.pseudo ?? 'Moi',
            auteurId: utilisateur?.id ?? null,
          });
          if (error) {
            signalerEchecEnvoi(elementVocal);
          }
        }

        if (fluxAudio) {
          fluxAudio.getTracks().forEach((track) => track.stop());
          fluxAudio = null;
        }

        estEnregistrementEnCours = false;
        boutonMicro.classList.remove('enregistrement');
        boutonMicro.title = 'Enregistrer un message vocal';
        saisieMessage.placeholder = 'Écrire un message';
      });

      mediaRecorder.start();
      estEnregistrementEnCours = true;
      boutonMicro.classList.add('enregistrement');
      boutonMicro.title = 'Arrêter et envoyer le message vocal';
      saisieMessage.placeholder = 'Enregistrement en cours... Cliquez sur le micro pour envoyer';
    } catch {
      // getUserMedia échoue si l'utilisateur refuse l'accès ou s'il n'y a pas de micro
      afficherAvisDiscussion('Impossible d\'accéder au microphone.');
    }
  });
}

// 3. Envoi de pièce jointe image (bouton +)
if (boutonJoindre) {
  boutonJoindre.addEventListener('click', () => {
    champFichier.click();
  });
}

champFichier.addEventListener('change', () => {
  const fichier = champFichier.files[0];
  if (!fichier) return;

  const imageUrl = URL.createObjectURL(fichier);
  ajouterMessage({ imageUrl, estEnvoye: true });
  champFichier.value = '';
});

defilerEnBas();
