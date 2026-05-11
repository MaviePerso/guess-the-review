import { Server } from "socket.io";
import { createServer } from "http";
import fs from 'fs';
import path from 'path';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;
const rooms = new Map();
let DB_PATH = path.join(process.cwd(), 'server', 'db_verified.json');

let questionDatabase = [];

try {
  const rawData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const sources = ["eBay", "Cdiscount", "Rakuten", "Fnac", "Darty"];
  
  questionDatabase = rawData.map(item => {
    return {
      productName: item.productName || item.title || "Produit Inconnu",
      reviewText: item.reviewText || "Produit conforme à la description, très satisfait.",
      realRating: parseFloat(item.realRating || item.rating) || 4.2,
      price: parseFloat(item.price) || 20,
      images: item.images || (item.image ? [item.image] : []),
      source: item.source || sources[Math.floor(Math.random() * sources.length)]
    };
  }).filter(item => item.images && item.images.length > 0 && item.price > 0);
  
  console.log([DB] Loaded  products. Pure random mode enabled.);
} catch (e) {
  console.error("[DB] Error loading DB:", e.message);
}

function getQuestions(count = 12) {
  if (questionDatabase.length < count) return [];
  
  // 100% Pure Random Selection
  const result = [];
  const indices = Array.from({length: questionDatabase.length}, (_, i) => i);
  
  // Simple Fisher-Yates shuffle for a subset
  for (let i = 0; i < count; i++) {
    const rand = i + Math.floor(Math.random() * (indices.length - i));
    [indices[i], indices[rand]] = [indices[rand], indices[i]];
    result.push(questionDatabase[indices[i]]);
  }
  
  return result;
}

const safeCb = (cb, data) => { if (typeof cb === 'function') cb(data); };

io.on("connection", (socket) => {
  socket.on("CREATE_ROOM", async ({ pseudo, mode } = {}, callback) => {
    if (!pseudo || pseudo.trim().length === 0) return safeCb(callback, { error: "Pseudo invalide" });
    const code = generateRoomCode();
    const player = { id: socket.id, pseudo: pseudo.trim(), isHost: true, connected: true, score: 0 };
    const qs = getQuestions(12);
    const newRoom = {
      code, hostId: socket.id, state: "LOBBY", players: [player],
      currentQuestionIndex: 0, questions: qs, isLoadingQuestions: false,
      mode: mode || "note", answers: {}, createdAt: Date.now()
    };
    rooms.set(code, newRoom);
    socket.join(code);
    safeCb(callback, { success: true, room: newRoom });
  });

  socket.on("JOIN_ROOM", ({ code, pseudo } = {}, callback) => {
    const roomCode = code?.toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return safeCb(callback, { error: "Cette room n'existe pas." });
    const existing = room.players.find(p => p.pseudo.toLowerCase() === pseudo?.trim().toLowerCase());
    if (existing) {
      existing.id = socket.id; existing.connected = true;
      if (room.hostId === existing.id) room.hostId = socket.id;
      socket.join(roomCode);
      safeCb(callback, { success: true, room });
      io.to(roomCode).emit("ROOM_UPDATED", room);
      return;
    }
    if (room.state !== "LOBBY" && room.state !== "FINISHED") return safeCb(callback, { error: "Partie en cours." });
    const player = { id: socket.id, pseudo: pseudo?.trim() || "Joueur", isHost: false, connected: true, score: 0 };
    room.players.push(player);
    socket.join(roomCode);
    safeCb(callback, { success: true, room });
    io.to(roomCode).emit("ROOM_UPDATED", room);
  });

  socket.on("START_GAME", ({ code } = {}, callback) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return safeCb(callback, { error: "Non autorisé" });
    room.state = "PLAYING"; room.currentQuestionIndex = 0; room.answers = {};
    room.players.forEach(p => p.score = 0);
    io.to(code).emit("ROOM_UPDATED", room);
    io.to(code).emit("GAME_STARTED");
    safeCb(callback, { success: true });
  });

  socket.on("SUBMIT_ANSWER", ({ code, rating, price } = {}, callback) => {
    const room = rooms.get(code);
    if (!room || room.state !== "PLAYING") return safeCb(callback, { error: "Erreur" });
    if (room.answers[socket.id]) return safeCb(callback, { error: "Déjà répondu" });
    const q = room.questions[room.currentQuestionIndex];
    let score = 0;
    if (room.mode === "note" || room.mode === "both") score += Math.max(0, 1 - Math.abs(q.realRating - rating));
    if (room.mode === "price" || room.mode === "both") score += Math.max(0, 1 - (Math.abs(q.price - price) / q.price) * 5);
    room.answers[socket.id] = { playerId: socket.id, rating, price, points: Math.round(score * 10) / 10 };
    safeCb(callback, { success: true });
    io.to(code).emit("ROOM_UPDATED", room);
    const active = room.players.filter(p => p.connected);
    if (active.every(p => room.answers[p.id])) {
      room.state = "REVEAL";
      Object.entries(room.answers).forEach(([pId, ans]) => {
        const p = room.players.find(pl => pl.id === pId);
        if (p) p.score = Math.round((p.score + ans.points) * 10) / 10;
      });
      io.to(code).emit("ROOM_UPDATED", room);
      io.to(code).emit("REVEAL_QUESTION");
    }
  });

  socket.on("NEXT_QUESTION", ({ code } = {}, callback) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id || room.state !== "REVEAL") return safeCb(callback, { error: "Non autorisé" });
    if (room.currentQuestionIndex >= room.questions.length - 1) room.state = "FINISHED";
    else { room.state = "PLAYING"; room.currentQuestionIndex++; room.answers = {}; }
    io.to(code).emit("ROOM_UPDATED", room);
    safeCb(callback, { success: true });
  });

  socket.on("RESTART_GAME", ({ code } = {}, callback) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return safeCb(callback, { error: "Non autorisé" });
    room.questions = getQuestions(12);
    room.state = "PLAYING"; room.currentQuestionIndex = 0; room.answers = {};
    room.players.forEach(p => p.score = 0);
    io.to(code).emit("ROOM_UPDATED", room);
    io.to(code).emit("GAME_STARTED");
    safeCb(callback, { success: true });
  });

  socket.on("disconnect", () => {
    rooms.forEach((room, code) => {
      const p = room.players.find(pl => pl.id === socket.id);
      if (p) { p.connected = false; io.to(code).emit("ROOM_UPDATED", room); }
    });
  });
});

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

httpServer.on('request', async (req, res) => {
  const url = new URL(req.url, http://localhost);
  
  // CORS headers for frontend solo mode
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (url.pathname === '/health' || url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', items: questionDatabase.length }));
    return;
  }

  // Solo mode: returns N random questions from the real DB
  if (url.pathname === '/questions') {
    const count = Math.min(parseInt(url.searchParams.get('count') || '10', 10), 50);
    const questions = getQuestions(count);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(questions));
    return;
  }

  res.writeHead(404); res.end();
});

httpServer.listen(PORT, "0.0.0.0", () => console.log(🚀 Server started on port  (Pure Random Mode)));
