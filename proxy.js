const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const WebSocket = require('ws');
const path = require('path');

// Chemin vers le fichier proto
const PROTO_PATH = path.join(__dirname, 'chat.proto');

// Chargement du fichier proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const chatProto = grpc.loadPackageDefinition(packageDefinition).chat;

// Fonction pour créer un client gRPC
function createGrpcClient() {
  return new chatProto.ChatService('localhost:50051',
    grpc.credentials.createInsecure());
}

// Création d'un serveur WebSocket servant de reverse proxy
const wss = new WebSocket.Server({ port: 8080 });
console.log('Reverse proxy WebSocket en écoute sur ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('Nouveau client WebSocket connecté.');

  // Créer un client gRPC pour cette connexion WebSocket
  const grpcClient = createGrpcClient();
  let grpcChatStream = null; // Stream pour la méthode Chat, initialisé sur le premier message de chat

  // Relayer les messages reçus du client WebSocket
  ws.on('message', (message) => {
    const messageString = message.toString(); // Convertir buffer en string
    console.log('Message reçu du client WebSocket:', messageString);
    try {
      const parsedMessage = JSON.parse(messageString);

      // --- GESTION DES DIFFÉRENTS TYPES DE MESSAGES ---
      if (parsedMessage.type === 'get_history_request') {
        console.log('Demande d\'historique reçue:', parsedMessage.payload || {});
        // Appel gRPC unaire pour GetChatHistory
        grpcClient.getChatHistory(parsedMessage.payload || {}, (err, response) => {
          if (err) {
            console.error('Erreur gRPC GetChatHistory:', err);
            ws.send(JSON.stringify({ type: 'history_error', error: err.message }));
          } else {
            console.log('Historique reçu du serveur gRPC:', response.messages.length, 'messages');
            ws.send(JSON.stringify({ type: 'history_response', payload: response }));
          }
        });
      } else if (parsedMessage.chat_message) { // C'est un message de chat normal
        // Initialiser le stream Chat si ce n'est pas déjà fait
        if (!grpcChatStream || grpcChatStream.writableEnded || grpcChatStream.readableEnded) { // Vérifier si le stream est actif
            console.log("Initialisation du stream gRPC Chat pour ce client.");
            grpcChatStream = grpcClient.Chat();

            // Relayer les messages du stream gRPC vers le client WebSocket
            grpcChatStream.on('data', (chatStreamMessage) => {
                console.log('Message (stream) reçu du serveur gRPC:', chatStreamMessage);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(chatStreamMessage));
                }
            });

            grpcChatStream.on('error', (err) => {
                console.error('Erreur dans le stream gRPC Chat:', err);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ error: `gRPC Stream Error: ${err.message}` }));
                }
                // On pourrait envisager de fermer le ws ici ou de tenter de recréer le stream.
            });

            grpcChatStream.on('end', () => {
                console.log('Stream gRPC Chat terminé côté serveur.');
                if (ws.readyState === WebSocket.OPEN) {
                    // Le serveur a terminé le stream, on peut notifier le client ou fermer.
                    // ws.close(); // Optionnel: fermer la connexion WS si le stream gRPC se termine.
                }
            });
        }
        grpcChatStream.write(parsedMessage);
      } else {
        console.warn('Type de message WebSocket inconnu ou format incorrect:', parsedMessage);
        ws.send(JSON.stringify({ error: 'Type de message inconnu ou format JSON incorrect pour le chat' }));
      }
      // --- FIN DE LA GESTION DES TYPES DE MESSAGES ---

    } catch (err) {
      console.error('Erreur lors de la conversion du message JSON ou traitement:', err);
      ws.send(JSON.stringify({ error: 'Format JSON invalide ou erreur de traitement interne' }));
    }
  });

  ws.on('close', () => {
    console.log('Client WebSocket déconnecté.');
    if (grpcChatStream && !grpcChatStream.writableEnded) {
      console.log('Fermeture du stream gRPC Chat suite à la déconnexion du client WS.');
      grpcChatStream.end(); // Termine proprement le stream gRPC si le client WS se déconnecte
    }
    // Il n'y a pas de stream à fermer pour getChatHistory car c'est un appel unaire.
    // Si le client gRPC lui-même doit être fermé, c'est ici :
    // grpcClient.close(); // Ferme la connexion du client gRPC
  });

  ws.on('error', (err) => {
    console.error('Erreur WebSocket:', err);
    if (grpcChatStream && !grpcChatStream.writableEnded) {
      console.log('Annulation du stream gRPC Chat suite à une erreur WebSocket.');
      grpcChatStream.cancel(); // Annule le stream gRPC en cas d'erreur WebSocket
    }
    // grpcClient.close(); // Potentiellement fermer aussi le client gRPC
  });
});

console.log("Attente de connexions WebSocket...");