// discussion.js — gestion de la zone de discussion active :
// envoi de messages texte, messages vocaux (micro), pièces jointes,
// défilement automatique et synchronisation avec Supabase.

import { envoyerMessageSupabase } from '../donnees/messages.js';
import { recupererSession } from '../donnees/authentification.js';

// ---- Éléments du DOM ----
const conteneurMessages = document.querySelector('.discussion__messages');
const formulaireMessage = document.getElementById('formulaire-message');
const saisieMessage = document.getElementById('saisie-message');
const boutonMicro = document.querySelector('.bouton-micro');
const boutonJoindre = document.querySelector('.bouton-joindre');
const enteteNom = document.querySelector('.discussion__nom');
const enteteAvatar = document.querySelector('.discussion__entete .avatar');

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

  const element = creerElementMessage({ texte, audioUrl, imageUrl, auteurPseudo, estEnvoye, heure });
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
}

// Remplace les messages affichés dans la discussion par une liste donnée.
export function chargerHistoriqueMessages(listeMessages) {
  if (!conteneurMessages) return;

  conteneurMessages.innerHTML = `
    <div class="separateur-date">
      <span class="separateur-date__texte">AUJOURD'HUI</span>
    </div>
  `;

  listeMessages.forEach((msg) => {
    const el = creerElementMessage(msg);
    conteneurMessages.appendChild(el);
  });

  defilerEnBas();
}

// Met à jour l'en-tête de la discussion avec le nom et les initiales du contact.
export function mettreAJourEnteteDiscussion(nom, initiales, classeAvatar = '') {
  if (enteteNom) enteteNom.textContent = nom;
  if (enteteAvatar) {
    enteteAvatar.textContent = initiales;
    enteteAvatar.className = `avatar ${classeAvatar}`.trim();
  }
}

// ---- Gestion des événements ----

// 1. Envoi de message texte via le formulaire et synchronisation Supabase
if (formulaireMessage) {
  formulaireMessage.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const texte = saisieMessage.value.trim();
    if (!texte) return;

    saisieMessage.value = '';

    // Récupérer la session pour obtenir le pseudo et ID de l'utilisateur
    let pseudo = 'Moi';
    let userId = null;
    try {
      const { data } = await recupererSession();
      if (data?.session?.user) {
        userId = data.session.user.id;
        pseudo = data.session.user.user_metadata?.nom_utilisateur
          || data.session.user.email?.split('@')[0]
          || 'Moi';
      }
    } catch (e) {
      console.warn('Session non disponible :', e);
    }

    // Affichage local immédiat
    ajouterMessage({ texte, estEnvoye: true, auteurPseudo: pseudo });

    // Envoi dans Supabase si un salon est actif
    if (window.salonIdActuel) {
      try {
        await envoyerMessageSupabase({
          salonId: window.salonIdActuel,
          contenu: texte,
          auteurPseudo: pseudo,
          auteurId: userId,
        });
      } catch (erreur) {
        console.error('Erreur lors de l’envoi à Supabase :', erreur);
      }
    }

    saisieMessage.focus();
  });
}

// 2. Enregistrement de message vocal (bouton micro)
if (boutonMicro) {
  boutonMicro.addEventListener('click', async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      alert("L'enregistrement vocal n'est pas pris en charge par votre navigateur.");
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

        ajouterMessage({ audioUrl, estEnvoye: true });

        // Synchronisation avec Supabase
        if (window.salonIdActuel) {
          try {
            const { data } = await recupererSession();
            const pseudo = data?.session?.user?.user_metadata?.nom_utilisateur
              || data?.session?.user?.email?.split('@')[0]
              || 'Moi';
            await envoyerMessageSupabase({
              salonId: window.salonIdActuel,
              contenu: '[Message vocal 🎙️]',
              auteurPseudo: pseudo,
              auteurId: data?.session?.user?.id || null,
            });
          } catch (e) {
            console.warn(e);
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
    } catch (erreur) {
      console.error('Erreur micro :', erreur);
      alert('Impossible d’accéder au microphone.');
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
