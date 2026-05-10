import fs from 'fs';
import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { 
    origin: "*", 
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;
const rooms = new Map();

// Questions loaded dynamically from our 5000+ DB
let questions = [];
try {
  questions = JSON.parse(fs.readFileSync("server/db.json", "utf8"));
  console.log(`Loaded ${questions.length} questions.`);
} catch (e) {
  console.log("Error loading db.json:", e.message);
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function getShuffledQuestions() {
  return [...questions].sort(() => Math.random() - 0.5).slice(0, 10);
}

function calculateScore(guessRating, realRating, guessPrice, realPrice, mode) {
  let score = 0;
  if (mode === "note" || mode === "both") {
    if (guessRating !== undefined && guessRating !== null) {
      const diff = Math.abs(realRating - guessRating);
      const noteScore = Math.max(0, 1 - diff);
      score += noteScore;
    }
  }
  if (mode === "price" || mode === "both") {
    if (guessPrice !== undefined && guessPrice !== null) {
      const diffPerc = Math.abs(realPrice - guessPrice) / realPrice;
      let priceScore = 0; 
      let accuracy = (1 - diffPerc) * 100; 
      if (accuracy >= 100) priceScore = 1; 
      else if (accuracy >= 98) priceScore = 0.9; 
      else if (accuracy >= 96) priceScore = 0.8; 
      else if (accuracy >= 94) priceScore = 0.7; 
      else if (accuracy >= 92) priceScore = 0.6; 
      else if (accuracy >= 90) priceScore = 0.5; 
      else if (accuracy >= 88) priceScore = 0.4; 
      else if (accuracy >= 86) priceScore = 0.3; 
      else if (accuracy >= 84) priceScore = 0.2; 
      else if (accuracy >= 82) priceScore = 0.1;
      score += priceScore;
    }
  }
  return Math.round(score * 100) / 100;
}

const safeCb = (cb, data) => {
    if (typeof cb === 'function') cb(data);
};

io.on("connection", (socket) => {
  console.log(`Joueur connecté: ${socket.id}`);

  socket.on("CREATE_ROOM", ({ pseudo, mode } = {}, callback) => {
    if (!pseudo || pseudo.trim().length === 0) return safeCb(callback, { error: "Pseudo invalide" });
    const code = generateRoomCode();
    const player = { 
        id: socket.id, 
        pseudo: pseudo.trim(), 
        isHost: true, 
        connected: true, 
        score: 0,
        joinedAt: Date.now() 
    };
    
    const newRoom = {
      code, 
      hostId: socket.id, 
      state: "LOBBY", 
      players: [player],
      currentQuestionIndex: 0, 
      questions: getShuffledQuestions(),
      mode: mode || "note",
      answers: {}, 
      createdAt: Date.now(), 
      updatedAt: Date.now()
    };
    rooms.set(code, newRoom);
    socket.join(code);
    safeCb(callback, { success: true, room: newRoom });
  });

  socket.on("JOIN_ROOM", ({ code, pseudo } = {}, callback) => {
    const roomCode = code?.toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return safeCb(callback, { error: "Cette room n'existe pas." });
    
    const existingPlayer = room.players.find(p => p.pseudo.toLowerCase() === pseudo?.trim().toLowerCase());
    
    if (existingPlayer) {
      // Reclaim the spot
      const oldId = existingPlayer.id;
      existingPlayer.id = socket.id;
      existingPlayer.connected = true;
      
      // Update hostId if necessary
      if (room.hostId === oldId) room.hostId = socket.id;

      // Update answers to new ID
      if (room.answers[oldId]) {
        room.answers[socket.id] = room.answers[oldId];
        delete room.answers[oldId];
      }

      socket.join(roomCode);
      safeCb(callback, { success: true, room });
      io.to(roomCode).emit("ROOM_UPDATED", room);
      return;
    }

    if (room.state !== "LOBBY" && room.state !== "FINISHED") return safeCb(callback, { error: "La partie est déjà en cours." });

    const player = { 
        id: socket.id, 
        pseudo: pseudo?.trim() || "Joueur", 
        isHost: false, 
        connected: true, 
        score: 0,
        joinedAt: Date.now() 
    };
    room.players.push(player);
    
    socket.join(roomCode);
    safeCb(callback, { success: true, room });
    socket.to(roomCode).emit("PLAYER_JOINED", player);
    io.to(roomCode).emit("ROOM_UPDATED", room);
  });

  socket.on("START_GAME", ({ code } = {}, callback) => {
    const room = rooms.get(code);
    if (!room) return safeCb(callback, { error: "Room introuvable" });
    if (room.hostId !== socket.id) return safeCb(callback, { error: "Seul l'hôte peut lancer le jeu" });
    
    room.state = "PLAYING";
    room.currentQuestionIndex = 0;
    room.answers = {};
    room.players.forEach(p => { p.score = 0; });
    
    io.to(code).emit("ROOM_UPDATED", room);
    io.to(code).emit("GAME_STARTED");
    safeCb(callback, { success: true });
  });

  socket.on("SUBMIT_ANSWER", ({ code, rating, price } = {}, callback) => {
    const room = rooms.get(code);
    if (!room) return safeCb(callback, { error: "Room introuvable" });
    if (room.state !== "PLAYING") return safeCb(callback, { error: `Erreur d'état : le jeu est en mode ${room.state}` });
    
    if (room.answers[socket.id]) return safeCb(callback, { error: "Vous avez déjà répondu." });

    const currentQuestion = room.questions[room.currentQuestionIndex];
    const points = calculateScore(rating, currentQuestion.realRating, price, currentQuestion.price, room.mode);

    room.answers[socket.id] = { playerId: socket.id, rating, price, points, submittedAt: Date.now() };
    
    safeCb(callback, { success: true });
    io.to(code).emit("ROOM_UPDATED", room);

    const activePlayers = room.players.filter(p => p.connected);
    const allAnswered = activePlayers.every(p => room.answers[p.id]);

    if (allAnswered) {
      room.state = "REVEAL";
      for (const [pId, ans] of Object.entries(room.answers)) {
        const player = room.players.find(p => p.id === pId);
        if (player) {
            player.score = Math.round((player.score + ans.points) * 100) / 100;
        }
      }
      io.to(code).emit("ROOM_UPDATED", room);
      io.to(code).emit("REVEAL_QUESTION");
    }
  });

  socket.on("NEXT_QUESTION", ({ code } = {}, callback) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id || room.state !== "REVEAL") return safeCb(callback, { error: "Action non autorisée" });
    if (room.currentQuestionIndex >= room.questions.length - 1) {
      room.state = "FINISHED";
    } else {
      room.state = "PLAYING";
      room.currentQuestionIndex++;
      room.answers = {};
    }
    io.to(code).emit("ROOM_UPDATED", room);
    safeCb(callback, { success: true });
  });

  socket.on("RESTART_GAME", ({ code } = {}, callback) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id || room.state !== "FINISHED") return safeCb(callback, { error: "Action non autorisée" });
    room.state = "PLAYING";
    room.currentQuestionIndex = 0;
    room.questions = getShuffledQuestions();
    room.answers = {};
    room.players.forEach(p => { p.score = 0; });
    
    io.to(code).emit("ROOM_UPDATED", room);
    io.to(code).emit("GAME_STARTED");
    safeCb(callback, { success: true });
  });

  const handleLeave = () => {
    rooms.forEach((room, code) => {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.connected = false;
        io.to(code).emit("ROOM_UPDATED", room);
        
        if (room.state === "PLAYING") {
            const activePlayers = room.players.filter(p => p.connected);
            if (activePlayers.length > 0 && activePlayers.every(p => room.answers[p.id])) {
                room.state = "REVEAL";
                for (const [pId, ans] of Object.entries(room.answers)) {
                    const pl = room.players.find(p => p.id === pId);
                    if (pl) pl.score = Math.round((pl.score + ans.points) * 100) / 100;
                }
                io.to(code).emit("ROOM_UPDATED", room);
                io.to(code).emit("REVEAL_QUESTION");
            }
        }
      }
    });
  };

  socket.on("LEAVE_ROOM", () => {
    rooms.forEach((room, code) => {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        if (room.players.length === 0) {
            rooms.delete(code);
        } else if (room.hostId === socket.id) {
            const nextPlayer = room.players.find(p => p.connected) || room.players[0];
            if (nextPlayer) room.hostId = nextPlayer.id;
        }
        io.to(code).emit("ROOM_UPDATED", room);
      }
    });
  });

  socket.on("disconnect", () => handleLeave());
});

httpServer.on('request', (req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), questions: questions.length }));
  }
});

setInterval(() => {
  const url = process.env.RENDER_EXTERNAL_URL || 'https://guess-the-review-backend.onrender.com';
  fetch(url + '/health').then(r => r.json()).then(d => console.log('Self-ping OK')).catch(() => {});
}, 14 * 60 * 1000);

httpServer.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
