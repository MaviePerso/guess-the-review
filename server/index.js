import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let DB_PATH = path.join(process.cwd(), 'server', 'db_verified.json');

const LUXURY_BLACKLIST = ['lamborghini', 'ferrari', 'porsche', 'bugatti', 'bentley', 'maserati', 'rolls royce', 'mclaren', 'aston martin', 'maybach', 'supercar', 'hypercar', 'rolex', 'patek', 'audemars', 'omega', 'breitling', 'cartier', 'hublot', 'tag heuer', 'gucci', 'vuitton', 'hermes', 'hermès', 'prada', 'chanel', 'dior', 'balenciaga', 'versace', 'givenchy', 'yves saint', 'armani', 'burberry', 'tiffany', 'boucheron', 'bulgari', 'yacht', 'private jet', 'jet prive', 'mansion', 'penthouse', 'villa', 'chateau', 'luxury', 'luxe', 'prestige', 'platinum', 'diamond', 'emerald', 'ruby', 'sapphire', 'gold bar', 'rare edition', 'limited prestige', 'exclusive mansion', 'luxury estate'];

function isLuxury(item) {
  if (!item) return false;
  const text = `${item.productName || ''} ${item.title || ''} ${item.reviewText || ''} ${item.description || ''}`.toLowerCase();
  return LUXURY_BLACKLIST.some(kw => text.includes(kw));
}

let questionDatabase = [];

try {
  const rawData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const sources = ["eBay", "Cdiscount", "Rakuten", "Fnac", "Darty"];
  
  const initialCount = rawData.length;
  questionDatabase = rawData.map(item => {
    return {
      productName: item.productName || item.title || "Produit Inconnu",
      reviewText: item.reviewText || "Produit conforme à la description, très satisfait.",
      realRating: parseFloat(item.realRating || item.rating) || 4.2,
      price: parseFloat(item.price) || 20,
      images: item.images || (item.image ? [item.image] : []),
      source: item.source || sources[Math.floor(Math.random() * sources.length)]
    };
  }).filter(item => {
    const hasImages = item.images && item.images.length > 0;
    const hasPrice = item.price > 0;
    const notLuxury = !isLuxury(item);
    return hasImages && hasPrice && notLuxury;
  });
  
  console.log(`[DB] Loaded ${questionDatabase.length} products (Filtered out ${initialCount - questionDatabase.length} items).`);
} catch (e) {
  console.error("[DB] Error loading DB:", e.message);
}

function getQuestions(count = 12) {
  if (questionDatabase.length < count) return [];
  const shuffled = [...questionDatabase].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("CREATE_ROOM", async ({ pseudo, mode } = {}, callback) => {
    if (!pseudo) return callback({ success: false, error: "Pseudo requis" });
    
    const code = uuidv4().substring(0, 5).toUpperCase();
    const questions = getQuestions(12);
    
    const room = {
      code,
      players: [{ id: socket.id, pseudo, score: 0, ready: false }],
      questions,
      currentQuestionIndex: 0,
      status: "waiting",
      mode: mode || "note",
      lastUpdate: Date.now()
    };
    
    rooms.set(code, room);
    socket.join(code);
    callback({ success: true, room });
  });

  socket.on("JOIN_ROOM", ({ code, pseudo }, callback) => {
    const room = rooms.get(code?.toUpperCase());
    if (!room) return callback({ success: false, error: "Room non trouvée" });
    if (room.status !== "waiting") return callback({ success: false, error: "Partie déjà commencée" });
    
    room.players.push({ id: socket.id, pseudo, score: 0, ready: false });
    socket.join(room.code);
    io.to(room.code).emit("ROOM_UPDATE", room);
    callback({ success: true, room });
  });

  socket.on("PLAYER_READY", ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (player) player.ready = true;
    
    if (room.players.every(p => p.ready)) {
      room.status = "playing";
      io.to(room.code).emit("GAME_START", room);
    } else {
      io.to(room.code).emit("ROOM_UPDATE", room);
    }
  });

  socket.on("SUBMIT_ANSWER", ({ code, score }) => {
    const room = rooms.get(code);
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (player) player.score += score;
    
    player.hasAnswered = true;
    
    if (room.players.every(p => p.hasAnswered)) {
      io.to(room.code).emit("REVEAL_ANSWER", room);
    } else {
      io.to(room.code).emit("ROOM_UPDATE", room);
    }
  });

  socket.on("NEXT_QUESTION", ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    
    room.currentQuestionIndex++;
    room.players.forEach(p => p.hasAnswered = false);
    
    if (room.currentQuestionIndex >= room.questions.length) {
      room.status = "finished";
      io.to(room.code).emit("GAME_OVER", room);
    } else {
      io.to(room.code).emit("NEW_QUESTION", room);
    }
  });

  socket.on("RESTART_GAME", ({ code } = {}, callback) => {
    const room = rooms.get(code);
    if (!room) return;
    
    room.questions = getQuestions(12);
    room.currentQuestionIndex = 0;
    room.status = "waiting";
    room.players.forEach(p => {
      p.score = 0;
      p.ready = false;
      p.hasAnswered = false;
    });
    
    io.to(room.code).emit("ROOM_UPDATE", room);
  });

  socket.on("REPLACE_QUESTION", ({ code } = {}, callback) => {
    const room = rooms.get(code);
    if (!room) return;

    const newQs = getQuestions(1);
    if (newQs.length > 0) {
      room.questions[room.currentQuestionIndex] = newQs[0];
      io.to(room.code).emit("QUESTION_REPLACED", room);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const [code, room] of rooms.entries()) {
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) {
        rooms.delete(code);
      } else {
        io.to(code).emit("ROOM_UPDATE", room);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
