// discussion.js — gestion de la zone de discussion active :
// envoi de messages texte, messages vocaux (micro), pièces jointes
// et défilement automatique.

// ---- Éléments du DOM ----
const conteneurMessages = document.querySelector('.discussion__messages');
const formulaireMessage = document.getElementById('formulaire-message');
const saisieMessage = document.getElementById('saisie-message');
const boutonMicro = document.querySelector('.bouton-micro');
const boutonJoindre = document.querySelector('.bouton-joindre');
const enteteNom = document.querySelector('.discussion__nom');
const enteteAvatar = document.querySelector('.discussion__entete .avatar');

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
export function formaterHeureCourante() {
  const maintenant = new Date();
  const heures = String(maintenant.getHours()).padStart(2, '0');
  const minutes = String(maintenant.getMinutes()).padStart(2, '0');
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
  estEnvoye = true,
  heure = formaterHeureCourante(),
}) {
  const elementMessage = document.createElement('div');
  elementMessage.className = `message ${estEnvoye ? 'message--envoye' : 'message--recu'}`;

  let contenuHtml = '';

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
  estEnvoye = true,
  heure = formaterHeureCourante(),
}) {
  if (!conteneurMessages) return;

  const element = creerElementMessage({ texte, audioUrl, imageUrl, estEnvoye, heure });
  conteneurMessages.appendChild(element);
  defilerEnBas();

  // Événement personnalisé pour avertir les autres modules (conversations.js)
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

// 1. Envoi de message texte via le formulaire
if (formulaireMessage) {
  formulaireMessage.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const texte = saisieMessage.value.trim();
    if (!texte) return;

    ajouterMessage({ texte, estEnvoye: true });
    saisieMessage.value = '';
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

    // Si un enregistrement est déjà en cours, on l'arrête
    if (estEnregistrementEnCours && mediaRecorder) {
      mediaRecorder.stop();
      return;
    }

    // Sinon, on démarre un nouvel enregistrement
    try {
      fluxAudio = await navigator.mediaDevices.getUserMedia({ audio: true });
      morceauxAudio = [];
      mediaRecorder = new MediaRecorder(fluxAudio);

      mediaRecorder.addEventListener('dataavailable', (evenement) => {
        if (evenement.data && evenement.data.size > 0) {
          morceauxAudio.push(evenement.data);
        }
      });

      mediaRecorder.addEventListener('stop', () => {
        const typeMime = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(morceauxAudio, { type: typeMime });
        const audioUrl = URL.createObjectURL(blob);

        ajouterMessage({ audioUrl, estEnvoye: true });

        // Libérer le micro
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
      console.error('Erreur lors de l’accès au micro :', erreur);
      alert('Impossible d’accéder au microphone. Vérifiez les autorisations.');
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

// Défilement automatique au chargement initial
defilerEnBas();
