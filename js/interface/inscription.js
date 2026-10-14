// inscription.js - gère le formulaire d'inscription : validation et affichage du résultat.
import { InscriptionUtilisateur } from "../donnees/authentification.js";
const formulaire = document.querySelector('.formulaire-auth');

formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    const courriel = document.getElementById('courriel').value.trim();
    const motDePasse = document.getElementById('mot-de-passe').value.trim();
    const nomUtilisateur = document.getElementById('nom-utilisateur').value.trim();

    // To Do : Ajouter les vérifs deux mots de passe identiques, contrôles champ vide et longueur
    const { error } = await InscriptionUtilisateur(courriel, motDePasse, nomUtilisateur);

    if (error){
        // To Do : Afficher erreur dans un élément de la page HTML
        return;        
    }
    window.location.href = 'index.html';
})


