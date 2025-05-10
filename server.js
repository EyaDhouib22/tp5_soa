const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
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

// Définition d'un utilisateur administrateur de base
const admin = {
  id: "admin",
  name: "Grpc_Admin",
  email: "grpc_admin@mail.com",
  status: "ACTIVE",
};

// --- AJOUTS POUR L'HISTORIQUE ---
// Tableau en mémoire pour stocker l'historique des messages
let chatHistory = [];
const MAX_HISTORY_SIZE = 50; // Garder les 50 derniers messages par exemple
// --- FIN DES AJOUTS POUR L'HISTORIQUE ---

// Implémentation de l'appel GetUser
function getUser(call, callback) {
  const userId = call.request.user_id;
  console.log(`Requête GetUser reçue pour id: ${userId}`);
  const user = { ...admin, id: userId };
  callback(null, { user });
}

// Implémentation de l'appel Chat (streaming bidirectionnel)
function chat(call) {
  console.log("Flux Chat démarré.");
  call.on('data', (chatStreamMessage) => {
    if (chatStreamMessage.chat_message) {
      const msg = chatStreamMessage.chat_message;
      console.log(`Message reçu de ${msg.sender_id} dans room ${msg.room_id}: ${msg.content}`);

      // Stocker le message original dans l'historique
      chatHistory.push(msg);
      // Limiter la taille de l'historique
      if (chatHistory.length > MAX_HISTORY_SIZE) {
        chatHistory.shift(); // Supprime le message le plus ancien
      }

      const reply = {
        id: msg.id + "_reply",
        room_id: msg.room_id,
        sender_id: admin.name,
        content: "received at " + new Date().toISOString(),
      };
      call.write({ chat_message: reply });
    }
  });

  call.on('end', () => {
    console.log("Fin du flux Chat.");
    call.end();
  });

  call.on('error', (err) => {
    console.error("Erreur dans le flux Chat:", err);
    // Il est important de terminer l'appel en cas d'erreur pour libérer les ressources.
    if (!call.cancelled) {
        call.end();
    }
  });
}

// --- NOUVELLE FONCTION: Implémentation de l'appel GetChatHistory ---
function getChatHistory(call, callback) {
  const request = call.request;
  console.log(`Requête GetChatHistory reçue. Room_id: "${request.room_id}", Limit: ${request.limit}`);

  let historyToSend = [...chatHistory]; // Crée une copie

  // Filtrer par room_id si fourni
  if (request.room_id) {
    historyToSend = historyToSend.filter(msg => msg.room_id === request.room_id);
  }

  // Limiter le nombre de messages si limit est fourni et positif
  if (request.limit && request.limit > 0 && request.limit < historyToSend.length) {
    historyToSend = historyToSend.slice(-request.limit); // Prend les 'limit' derniers messages
  } else if (request.limit && request.limit > 0) {
    // Si limit est plus grand que l'historique actuel, on envoie tout ce qu'on a
    // slice(-X) avec X > length renvoie un tableau vide, donc on ne fait rien si historyToSend.length <= request.limit
  }


  console.log(`Envoi de ${historyToSend.length} messages d'historique.`);
  callback(null, { messages: historyToSend });
}
// --- FIN DE LA NOUVELLE FONCTION ---

// Démarrage du serveur gRPC
function main() {
  const server = new grpc.Server();
  server.addService(chatProto.ChatService.service, {
    GetUser: getUser,
    Chat: chat,
    GetChatHistory: getChatHistory, // AJOUT DE LA NOUVELLE MÉTHODE AU SERVICE
  });

  const address = '0.0.0.0:50051';
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      console.error("Erreur lors du binding du serveur :", error);
      return;
    }
    console.log(`Serveur gRPC en écoute sur ${address}`);
  });
}

main();