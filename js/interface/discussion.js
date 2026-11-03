// discussion.js — gestion de la zone de discussion active :
// envoi de messages texte, messages vocaux (micro), pièces jointes,
// défilement automatique et synchronisation avec Supabase.

import { envoyerMessageSupabase } from '../donnees/messages.js';
import { recupererUtilisateurConnecte } from '../donnees/profils.js';
import { creerElement, detecterTypeContenu, formaterApercuContenu } from './utils.js';

// ---- Éléments du DOM ----
const conteneurMessages = document.querySelector('.discussion__messages');
const formulaireMessage = document.getElementById('formulaire-message');
const saisieMessage = document.getElementById('saisie-message');
const boutonMicro = document.querySelector('.bouton-micro');
const boutonJoindre = document.querySelector('.bouton-joindre');
const enteteNom = document.querySelector('.discussion__nom');

// Taille maximale d'une image : encodée en base64 (+33 %) dans messages.contenu,
// elle est rechargée à chaque ouverture de la conversation.
const TAILLE_MAX_IMAGE = 1024 * 1024; // 1 Mo

// id du salon ouvert, privé à ce module : conversations.js le change avec
// definirSalonActif(). null tant qu'aucune conversation n'est ouverte.
let idSalonActif = null;

// Mémorise le salon ouvert, dans lequel les messages seront envoyés.
export function definirSalonActif(idSalon) {
  idSalonActif = idSalon;
}

// État de l'enregistreur vocal
let mediaRecorder = null;
let morceauxAudio = [];
let estEnregistrementEnCours = false;
let fluxAudio = null;

// Détecte le meilleur type MIME audio pris en charge par le navigateur
function obtenirTypeMimeAudioSupporte() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

// Convertit un Blob en Data URL (base64) pour la transmission et le stockage
function blobEnDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onloadend = () => resolve(lecteur.result);
    lecteur.onerror = reject;
    lecteur.readAsDataURL(blob);
  });
}

// Entrée de fichier cachée pour les pièces jointes d'images, ouverte par le bouton +
const champFichier = document.createElement('input');
champFichier.type = 'file';
champFichier.accept = 'image/*';
champFichier.hidden = true;
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

// Crée et renvoie l'élément complet d'un message : bulle avec auteur (messages
// reçus), puis texte, lecteur audio ou image selon le contenu, puis heure.
export function creerElementMessage({
  contenu = '',
  auteurPseudo = '',
  estEnvoye = true,
  heure = formaterHeureCourante(),
}) {
  const type = detecterTypeContenu(contenu);
  const elementMessage = creerElement(
    'div', `message ${estEnvoye ? 'message--envoye' : 'message--recu'}`);
  const bulle = creerElement('div', 'message__bulle');

  if (!estEnvoye && auteurPseudo) {
    bulle.append(creerElement('span', 'message__auteur', auteurPseudo));
  }

  if (type === 'audio') {
    bulle.classList.add('message__bulle--audio');
    const audio = creerElement('audio', 'message__audio');
    audio.controls = true;
    audio.preload = 'metadata';
    audio.src = contenu;
    bulle.append(audio);
  } else if (type === 'image') {
    const image = creerElement('img', 'message__image');
    image.src = contenu;
    image.alt = 'Image partagée dans la conversation';
    bulle.append(image);
  } else if (contenu === '[Message vocal 🎙️]') {
    // Ancien vocal enregistré sans son fichier audio
    bulle.append(creerElement('p', 'message__texte', 'Message vocal indisponible (ancien format)'));
  } else if (contenu) {
    bulle.append(creerElement('p', 'message__texte', contenu));
  }

  bulle.append(creerElement('span', 'message__horodatage', heure));
  elementMessage.append(bulle);
  return elementMessage;
}

// Ajoute un message à la discussion active et fait défiler vers le bas.
export function ajouterMessage({
  contenu = '',
  auteurPseudo = '',
  estEnvoye = true,
  heure = formaterHeureCourante(),
}) {
  if (!conteneurMessages) return null;

  const element = creerElementMessage({ contenu, auteurPseudo, estEnvoye, heure });
  conteneurMessages.appendChild(element);
  defilerEnBas();

  document.dispatchEvent(new CustomEvent('message-ajoute', {
    detail: {
      texte: formaterApercuContenu(contenu),
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
    if (!idSalonActif) {
      afficherAvisDiscussion('Ouvrez une conversation avant d\'envoyer un message.');
      return;
    }

    saisieMessage.value = '';

    // Pseudo à jour et id de l'utilisateur, pour l'affichage et l'enregistrement
    const utilisateur = await recupererUtilisateurConnecte();
    const pseudo = utilisateur?.pseudo ?? 'Moi';
    const userId = utilisateur?.id ?? null;

    // Affichage local immédiat, signalé en échec si la base refuse le message
    const elementMessage = ajouterMessage({
      contenu: texte, estEnvoye: true, auteurPseudo: pseudo,
    });

    const { error } = await envoyerMessageSupabase({
      salonId: idSalonActif,
      contenu: texte,
      auteurPseudo: pseudo,
      auteurId: userId,
    });
    if (error) {
      signalerEchecEnvoi(elementMessage);
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
      const typeMimePrefere = obtenirTypeMimeAudioSupporte();
      const options = typeMimePrefere ? { mimeType: typeMimePrefere } : undefined;
      mediaRecorder = new MediaRecorder(fluxAudio, options);

      mediaRecorder.addEventListener('dataavailable', (evenement) => {
        if (evenement.data && evenement.data.size > 0) {
          morceauxAudio.push(evenement.data);
        }
      });

      mediaRecorder.addEventListener('stop', async () => {
        const typeMime = mediaRecorder.mimeType || typeMimePrefere || 'audio/webm';
        const blob = new Blob(morceauxAudio, { type: typeMime });

        if (fluxAudio) {
          fluxAudio.getTracks().forEach((track) => track.stop());
          fluxAudio = null;
        }

        estEnregistrementEnCours = false;
        boutonMicro.classList.remove('enregistrement');
        boutonMicro.setAttribute('aria-label', 'Enregistrer un message vocal');
        saisieMessage.placeholder = 'Écrire un message';

        if (blob.size === 0) return;

        try {
          const audioDataUrl = await blobEnDataUrl(blob);
          const utilisateur = await recupererUtilisateurConnecte();
          const pseudo = utilisateur?.pseudo ?? 'Moi';
          const userId = utilisateur?.id ?? null;

          // Affichage local immédiat avec le lecteur audio seul (sans texte)
          const elementVocal = ajouterMessage({
            contenu: audioDataUrl,
            estEnvoye: true,
            auteurPseudo: pseudo,
          });

          // Synchronisation avec Supabase des vraies données audio
          if (idSalonActif) {
            const { error } = await envoyerMessageSupabase({
              salonId: idSalonActif,
              contenu: audioDataUrl,
              auteurPseudo: pseudo,
              auteurId: userId,
            });
            if (error) {
              signalerEchecEnvoi(elementVocal);
            }
          }
        } catch {
          // blobEnDataUrl échoue si l'enregistrement ne peut pas être lu
          afficherAvisDiscussion('Impossible de finaliser le message vocal.');
        }
      });

      mediaRecorder.start();
      estEnregistrementEnCours = true;
      boutonMicro.classList.add('enregistrement');
      boutonMicro.setAttribute('aria-label', 'Arrêter et envoyer le message vocal');
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

champFichier.addEventListener('change', async () => {
  const fichier = champFichier.files[0];
  champFichier.value = '';
  if (!fichier) return;

  if (!fichier.type.startsWith('image/')) {
    afficherAvisDiscussion('Seules les images peuvent être envoyées.');
    return;
  }
  if (fichier.size > TAILLE_MAX_IMAGE) {
    afficherAvisDiscussion('Image trop lourde : 1 Mo maximum.');
    return;
  }
  if (!idSalonActif) {
    afficherAvisDiscussion('Ouvrez une conversation avant d\'envoyer une image.');
    return;
  }

  try {
    const imageDataUrl = await blobEnDataUrl(fichier);
    const utilisateur = await recupererUtilisateurConnecte();
    const elementImage = ajouterMessage({ contenu: imageDataUrl, estEnvoye: true });

    const { error } = await envoyerMessageSupabase({
      salonId: idSalonActif,
      contenu: imageDataUrl,
      auteurPseudo: utilisateur?.pseudo ?? 'Moi',
      auteurId: utilisateur?.id ?? null,
    });
    if (error) {
      signalerEchecEnvoi(elementImage);
    }
  } catch {
    afficherAvisDiscussion('Impossible de lire l\'image.');
  }
});

defilerEnBas();
