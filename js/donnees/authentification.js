// authentification.js - appels Supabase Auth (inscription, connexion).
import { client } from "./config-supabase.js";

// Crée un compte Supabase Auth ; le pseudo est stocké dans les métadonnées.
// Renvoie { data, error }.
export async function InscriptionUtilisateur(courriel, motDePasse, nomUtilisateur) {
    return client.auth.signUp({
        email: courriel,
        password: motDePasse,
        options: { data: { nom_utilisateur: nomUtilisateur } },
    });
}