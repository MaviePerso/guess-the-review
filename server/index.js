import fs from 'fs';
import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3001;
const rooms = new Map();

// Questions loaded dynamically from our 5000+ DB
let questions = [];
try {
  questions = JSON.parse(fs.readFileSync("db.json", "utf8"));
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
      const noteScore = Math.max(0, 1 - diff); // diff 0.1 => 0.9 points
      score += noteScore;
    }
  }
  if (mode === "price" || mode === "both") {
    if (guessPrice !== undefined && guessPrice !== null) {
      const diffPerc = Math.abs(realPrice - guessPrice) / realPrice;
      let priceScore = 0; let accuracy = (1 - diffPerc) * 100; if (accuracy >= 100) priceScore = 1; else if (accuracy >= 98) priceScore = 0.9; else if (accuracy >= 96) priceScore = 0.8; else if (accuracy >= 94) priceScore = 0.7; else if (accuracy >= 92) priceScore = 0.6; else if (accuracy >= 90) priceScore = 0.5; else if (accuracy >= 88) priceScore = 0.4; else if (accuracy >= 86) priceScore = 0.3; else if (accuracy >= 84) priceScore = 0.2; else if (accuracy >= 82) priceScore = 0.1; // diff 10% => 0.9 points
      score += priceScore;
    }
  }
  return Math.round(score * 100) / 100;
}

io.on("connection", (socket) => {
  console.log(`Joueur connecté: ${socket.id}`);

  socket.on("CREATE_ROOM", ({ pseudo, mode }, callback) => {
    if (!pseudo || pseudo.trim().length === 0) return callback({ error: "Pseudo invalide" });
    const code = generateRoomCode();
    const player = { id: socket.id, pseudo: pseudo.trim(), isHost: true, connected: true, joinedAt: Date.now() };
    
    const newRoom = {
      code, hostId: socket.id, state: "LOBBY", players: [player],
      currentQuestionIndex: 0, questions: getShuffledQuestions(),
      mode: mode || "note", // "note", "price", "both"
      answers: {}, scores: { [socket.id]: 0 },
      createdAt: Date.now(), updatedAt: Date.now()
    };
    rooms.set(code, newRoom);
    socket.join(code);
    callback({ success: true, room: newRoom });
  });

  socket.on("JOIN_ROOM", ({ code, pseudo }, callback) => {
    const roomCode = code?.toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return callback({ error: "Cette room n'existe pas." });
    if (room.state !== "LOBBY" && room.state !== "FINISHED") return callback({ error: "La partie est déjà en cours." });
    if (room.players.some(p => p.pseudo.toLowerCase() === pseudo.trim().toLowerCase())) return callback({ error: "Ce pseudo est déjà utilisé." });

    const player = { id: socket.id, pseudo: pseudo.trim(), isHost: false, connected: true, joinedAt: Date.now() };
    room.players.push(player);
    if (room.scores[socket.id] === undefined) room.scores[socket.id] = 0;
    
    socket.join(roomCode);
    callback({ success: true, room });
    socket.to(roomCode).emit("PLAYER_JOINED", player);
    io.to(roomCode).emit("ROOM_UPDATED", room);
  });

  socket.on("START_GAME", ({ code }, callback) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return callback({ error: "Action non autorisée" });
    room.state = "PLAYING";
    room.currentQuestionIndex = 0;
    room.answers = {};
    Object.keys(room.scores).forEach(k => { room.scores[k] = 0; });
    io.to(code).emit("ROOM_UPDATED", room);
    io.to(code).emit("GAME_STARTED");
    callback({ success: true });
  });

  socket.on("SUBMIT_ANSWER", ({ code, rating, price }, callback) => {
    const room = rooms.get(code);
    if (!room || room.state !== "PLAYING") return callback({ error: "Erreur d'état" });
    if (room.answers[socket.id]) return callback({ error: "Vous avez déjà répondu." });

    const currentQuestion = room.questions[room.currentQuestionIndex];
    const points = calculateScore(rating, currentQuestion.realRating, price, currentQuestion.price, room.mode);

    room.answers[socket.id] = { playerId: socket.id, rating, price, points, submittedAt: Date.now() };
    callback({ success: true });
    io.to(code).emit("ANSWER_RECEIVED", socket.id);

    const activePlayers = room.players.filter(p => p.connected);
    const allAnswered = activePlayers.every(p => room.answers[p.id]);

    if (allAnswered) {
      room.state = "REVEAL";
      for (const [pId, ans] of Object.entries(room.answers)) {
        room.scores[pId] = (room.scores[pId] || 0) + ans.points;
      }
      io.to(code).emit("ROOM_UPDATED", room);
      io.to(code).emit("REVEAL_QUESTION");
    }
  });

  socket.on("NEXT_QUESTION", ({ code }, callback) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id || room.state !== "REVEAL") return callback({ error: "Action non autorisée" });
    if (room.currentQuestionIndex >= room.questions.length - 1) {
      room.state = "FINISHED";
    } else {
      room.state = "PLAYING";
      room.currentQuestionIndex++;
      room.answers = {};
    }
    io.to(code).emit("ROOM_UPDATED", room);
    callback({ success: true });
  });

  socket.on("RESTART_GAME", ({ code }, callback) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id || room.state !== "FINISHED") return callback({ error: "Action non autorisée" });
    room.state = "PLAYING";
    room.currentQuestionIndex = 0;
    room.questions = getShuffledQuestions();
    room.answers = {};
    Object.keys(room.scores).forEach(k => { room.scores[k] = 0; });
    io.to(code).emit("ROOM_UPDATED", room);
    io.to(code).emit("GAME_STARTED");
    callback({ success: true });
  });

  const handleLeave = () => {
    rooms.forEach((room, code) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        io.to(code).emit("PLAYER_LEFT", socket.id);

        if (room.players.length === 0) {
          rooms.delete(code);
        } else if (room.hostId === socket.id) {
          const newHost = room.players[0];
          newHost.isHost = true;
          room.hostId = newHost.id;
          io.to(code).emit("HOST_CHANGED", newHost.id);
        }
        io.to(code).emit("ROOM_UPDATED", room);
      }
    });
  };

  socket.on("LEAVE_ROOM", () => handleLeave());
  socket.on("disconnect", () => handleLeave());
});


// Health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), questions: questions.length }));
  }
});

// Self-ping every 14 minutes to prevent Render free tier sleep
setInterval(() => {
  const url = process.env.RENDER_EXTERNAL_URL || 'https://guess-the-review-backend.onrender.com';
  fetch(url + '/health').then(r => r.json()).then(d => console.log('Self-ping OK:', d.uptime + 's')).catch(() => {});
}, 14 * 60 * 1000);

httpServer.listen(PORT, () => console.log(`🚀 Serveur Socket.IO démarré sur le port ${PORT}`));

