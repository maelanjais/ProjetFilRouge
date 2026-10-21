# Messagerie — Projet fil-rouge 8WEB101 (UQAC)

Messagerie instantanée Web permettant d'échanger des messages texte en temps
réel, réalisée en HTML, CSS et JavaScript natifs avec Supabase pour la
persistance des données.

**Site en ligne :** https://maelanjais.github.io/ProjetFilRouge/

## Équipe

- Raphaël Seyrat
- Maëlan Jahier

## Fonctionnalités

| Fonctionnalité
| --- |
| Inscription / connexion
| Liste de contacts
| Liste des salons de conversation
| Envoi et réception de messages en temps réel
| Panneau des paramètres
| Fonctionnalité supplémentaire : messages vocaux

### Fonctionnalité supplémentaire : messages vocaux

En plus des messages texte, l'utilisateur peut enregistrer un message vocal
avec le micro de son appareil et l'envoyer dans le salon. Les autres
participants le reçoivent en temps réel et peuvent l'écouter directement dans
la conversation.

## Arborescence

```
index.html             # Page de messagerie
connexion.html         # Connexion
inscription.html       # Création de compte
css/
  style.css            # Styles globaux (variables, base, layout)
  authentification.css # Styles communs à connexion.html et inscription.html
  index.css            # Styles spécifiques à l'écran de messagerie
js/
  interface/           # Manipulation du DOM et événements (affichage)
    parametres.js      # Panneau latéral des paramètres
    contacts.js        # Panneau latéral de la liste des contacts
    discussion.js      # Zone de discussion, envoi des messages et vocal
    conversations.js   # Liste des conversations, sélection et recherche
    index.js           # Contrôle d'accès et synchronisation du profil
    utils.js           # Messages d'erreur et utilitaires
  donnees/             # Appels Supabase uniquement, sans DOM
    config-supabase.js # Client Supabase et configuration
    authentification.js# Fonctions d'authentification Supabase Auth
maquettes/             # Maquettes des écrans (connexion, inscription, accueil)
```

## Base de données (Supabase)

### Tables

**`auth.users`** : table des comptes, gérée par Supabase Auth (non modifiable
directement). Le pseudo saisi à l'inscription y est stocké dans les métadonnées
(`raw_user_meta_data.nom_utilisateur`).

**`profils`** : profil public de chaque compte, utilisé pour rechercher un
utilisateur par son pseudo.

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `id` | `uuid` | Clé primaire, référence `auth.users(id)` (suppression en cascade) |
| `nom_utilisateur` | `text` | Obligatoire, 3 à 30 caractères, unique sans tenir compte de la casse |
| `date_creation` | `timestamptz` | Par défaut : `now()` |

**`contacts`** : liste de contacts. Une ligne signifie « `proprietaire_id` a
ajouté `contact_id` » (relation à sens unique).

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `proprietaire_id` | `uuid` | Référence `profils(id)` (suppression en cascade) |
| `contact_id` | `uuid` | Référence `profils(id)` (suppression en cascade) |
| `date_creation` | `timestamptz` | Par défaut : `now()` |

Clé primaire composée `(proprietaire_id, contact_id)` : un même contact ne peut
pas être ajouté deux fois. Une contrainte `check` empêche de s'ajouter soi-même.

**`salons`** : salons de conversation.

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `id` | `int8` | Clé primaire |
| `date_creation` | `timestamptz` | Par défaut : `now()` |
| `nom` | `varchar` | Nom affiché du salon |
| `cree_par` | `uuid` | Clé étrangère vers `profils(id)`, mise à `null` si le compte est supprimé |

**`messages`** : messages envoyés dans les salons.

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `id` | `int8` | Clé primaire |
| `date_creation` | `timestamptz` | Par défaut : `now()`, sert à l'horodatage |
| `salon_id` | `int8` | Clé étrangère vers `salons(id)` (suppression en cascade) |
| `auteur_id` | `uuid` | Clé étrangère vers `profils(id)`, mise à `null` si le compte est supprimé |
| `auteur_pseudo` | `varchar` | Pseudo de l'auteur au moment de l'envoi |
| `contenu` | `text` | Texte du message |

### Création automatique du profil

À chaque inscription, le déclencheur `declencheur_creer_profil` (exécuté
`after insert on auth.users`) appelle la fonction `creer_profil_utilisateur()`.
Celle-ci crée la ligne correspondante dans `profils` à partir du pseudo des
métadonnées. La fonction est en `security definer` pour pouvoir écrire dans
`profils` quel que soit l'utilisateur. Si le pseudo est déjà pris, l'inscription
échoue grâce à la contrainte d'unicité.

## Lancer le projet en local

Ouvrir le site avec un
serveur local, par exemple l'extension **Live Server** de VS Code (clic droit
sur `index.html` → « Open with Live Server »).
