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
  donnees/             # Appels Supabase uniquement, sans DOM
maquettes/             # Maquettes des écrans (connexion, inscription, accueil)
```

## Lancer le projet en local

Ouvrir le site avec un
serveur local, par exemple l'extension **Live Server** de VS Code (clic droit
sur `index.html` → « Open with Live Server »).
