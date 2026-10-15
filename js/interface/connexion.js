// connexion.js - gère le formulaire de connexion : validation et affichage du résultat.
import { connecterUtilisateur } from '../donnees/authentification.js';
import { afficherErreur, traduireErreurAuth } from './utils.js';


const formulaire = document.querySelector('.formulaire-auth');

formulaire.addEventListener('submit', async (evenement) => {
	evenement.preventDefault();
	const courriel = document.getElementById('courriel').value.trim();
	const motDePasse = document.getElementById('mot-de-passe').value;

	const { error: erreurConnexion } = await connecterUtilisateur(courriel, motDePasse);

	if (erreurConnexion) {
		afficherErreur(traduireErreurAuth(erreurInscription));
		return;
	}
	window.location.href = 'index.html';
});

