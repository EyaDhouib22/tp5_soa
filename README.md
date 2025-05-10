# TP5 : Reverse Proxy WebSocket avec Microservice gRPC

Ce projet est un exercice pratique visant à construire un service de chat simplifié. Il utilise gRPC pour la communication backend et un reverse proxy WebSocket pour connecter des clients web à ce service gRPC.

**Objectifs Principaux :**

*   Comprendre la définition d'un service gRPC avec Protobuf (`.proto`).
*   Mettre en œuvre un serveur gRPC en Node.js.
*   Développer un reverse proxy WebSocket qui fait le pont entre les clients WebSocket et le serveur gRPC.
*   Implémenter une fonctionnalité d'historique des messages.
*   Optionnellement, créer un client web basique pour interagir avec le système.

## Architecture du Projet

Le système comprend trois composants essentiels :

1.  **Serveur gRPC** : Cœur du système, il gère la logique du chat, incluant l'envoi et la réception de messages en temps réel, ainsi que la fourniture de l'historique des conversations. Il écoute sur le port `50051`.
2.  **Reverse Proxy WebSocket** : Ce composant expose une interface WebSocket (sur le port `8080`) aux clients. Il traduit les messages WebSocket en appels gRPC et vice-versa, permettant aux navigateurs de communiquer indirectement avec le service gRPC.
3.  **Client Web (Optionnel)** : Une page HTML simple utilisant JavaScript pour se connecter au serveur WebSocket, envoyer des messages, et afficher les conversations et l'historique.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

*   Node.js (version 14.x ou plus récente est conseillée).
*   npm (qui est généralement fourni avec Node.js).
*   Postman (utile pour tester les connexions WebSocket si vous n'utilisez pas le client web fourni).

## Installation

1.  **Récupérez les fichiers du projet :** Assurez-vous que `chat.proto`, `server.js`, `proxy.js`, et (si utilisé) `client.html` sont dans un même répertoire de projet.
2.  **Ouvrez un terminal** et naviguez vers ce répertoire.
3.  **Initialisez un projet Node.js** (si ce n'est pas déjà un projet Node.js) : Entrez la commande `npm init -y`.
4.  **Installez les dépendances** requises par le projet : Entrez la commande `npm install @grpc/grpc-js @grpc/proto-loader ws`.

## Comment Lancer le Projet

Suivez ces étapes dans l'ordre :

### 1. Démarrer le Serveur gRPC

*   Dans votre premier terminal, exécutez : `node server.js`
*   Le serveur devrait indiquer qu'il écoute sur `0.0.0.0:50051`.

### 2. Démarrer le Reverse Proxy WebSocket

*   Ouvrez un **second terminal**.
*   Dans ce nouveau terminal, exécutez : `node proxy.js`
*   Le proxy devrait indiquer qu'il écoute sur `ws://localhost:8080`.

## Comment Tester

Vous avez deux options principales pour tester :

### A. Avec le Client Web (`client.html`)

1.  Ouvrez le fichier `client.html` directement dans votre navigateur web.
2.  Utilisez l'interface pour :
    *   Spécifier un nom d'utilisateur et un identifiant de salle de discussion.
    *   Envoyer des messages de chat.
    *   Demander et afficher l'historique des messages de la salle.

### B. Avec Postman (Alternative)

1.  Lancez Postman.
2.  Créez une nouvelle requête de type "WebSocket Request".
3.  Connectez-vous à l'URL : `ws://localhost:8080`.
4.  **Pour le chat :** Envoyez des messages JSON structurés pour la communication de chat (voir la documentation du TP pour le format exact).
5.  **Pour l'historique :** Envoyez des messages JSON spécifiques pour demander l'historique des messages (voir la documentation du TP pour le format).

## Fonctionnalités Clés Implémentées

*   **Communication en temps réel :** Grâce au streaming bidirectionnel gRPC et aux WebSockets.
*   **Historique des messages :** Le serveur stocke les messages récents et peut les fournir sur demande.
*   **Définition de service Protobuf :** Utilisation de `.proto` pour une définition claire des messages et services.

