# OPÉRATION COPENHAGUE — prototype de site web

Prototype avec interface rouge et blanche inspirée du drapeau danois, deux parcours (POP ALPHA / POP BRAVO), panneau administrateur, édition des missions, liens Google Maps, photos par URL, génération de QR codes et chronomètre partagé.

## Lancer sur votre ordinateur

1. Installer Node.js 18 ou plus récent : https://nodejs.org/
2. Décompresser ce dossier.
3. Ouvrir un terminal dans le dossier du projet.
4. Exécuter :
   ```bash
   npm install
   npm start
   ```
5. Ouvrir http://localhost:3000

Le site n'est accessible que depuis votre ordinateur avec cette adresse. Pour que les téléphones des jeunes puissent y accéder sur Internet, il faut déployer le projet sur un hébergeur Node.js (par exemple Render, Railway ou un serveur équivalent) et utiliser l'adresse HTTPS fournie.

## Administration

- Code initial : `1717`
- Le code peut être remplacé avec la variable d'environnement `ADMIN_PIN`.
- Dans le panneau administrateur, vous pouvez modifier le titre, le texte d'introduction, la durée, la couleur, les missions des deux équipes, les réponses acceptées, les indices, les photos, les lieux, les liens Google Maps et le point final.
- Vous pouvez créer un QR code avec le texte ou l'URL de votre choix puis enregistrer son image.
- Le chronomètre est partagé par le serveur. Le panneau permet de démarrer/réinitialiser, mettre en pause et reprendre le chrono.
- La limite de deux sessions actives est gérée côté serveur. Une session est libérée en cliquant sur « Quitter » ou automatiquement après 45 minutes sans activité. L'administrateur peut aussi libérer toutes les sessions.

## À savoir avant une utilisation réelle

Ce projet est un prototype de départ, pas un service de production audité. Avant de l'exposer sur Internet :
- remplacez le code `1717` par un code privé via `ADMIN_PIN`;
- définissez une longue valeur aléatoire pour `SESSION_SECRET`;
- activez HTTPS chez l'hébergeur;
- ajoutez une vraie base de données si les données doivent survivre à des redéploiements ou servir plusieurs instances;
- vérifiez la configuration des cookies de session pour l'hébergeur choisi;
- testez les deux connexions sur deux téléphones et le parcours complet avant le jour du jeu.

Les réponses aux missions sont vérifiées dans le navigateur pour le prototype : ne les utilisez pas comme mécanisme de sécurité ou de compétition à enjeu. Les QR codes générés encodent simplement le texte/l'URL que vous fournissez ; ils ne déverrouillent pas automatiquement une mission dans cette version.
