// authentification.js - appels Supabase Auth (inscription, connexion).
import { client } from './config-supabase.js';

// Crée un compte Supabase Auth ; le pseudo est stocké dans les métadonnées.
// Renvoie { data, error }.
export async function inscrireUtilisateur(courriel, motDePasse, nomUtilisateur) {
	return client.auth.signUp({
		email: courriel,
		password: motDePasse,
		options: { data: { nom_utilisateur: nomUtilisateur } },
	});
}

// Connecte l'utilisateur avec son courriel et son mot de passe.
// Renvoie { data, error } ; en cas de succès, data.session contient la session ouverte.
export async function connecterUtilisateur(courriel, motDePasse) {
	return client.auth.signInWithPassword({
		email: courriel,
		password: motDePasse,
	});
}

// Vérifie si un utilisateur est connecté.
export async function recupererSession() {
	//To do : client.auth.getSession()
}

// Déconnecte l'utilisateur de sa session.
export async function deconnecterUtilisateur() {
	//To do : client.auth.signOut()
}