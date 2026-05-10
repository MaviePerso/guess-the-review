import fs from 'fs';
import { Server } from "socket.io";
import { createServer } from "http";
import axios from 'axios';
import * as cheerio from 'cheerio';

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

// Questions cache to make it "infinite"
let questionCache = [];
const KEYWORDS = [
  "cuisine", "ordinateur", "smartphone", "jouet", "décoration", "meuble", "vêtement", "chaussure", 
  "outil", "jardin", "sport", "vélo", "montre", "sac", "casque audio", "gaming", "peluche", 
  "lampe", "tableau", "livre", "maquillage", "parfum", "robot", "aspirateur", "cafetière",
  "drone", "projecteur", "clavier", "souris", "moniteur", "bureau", "chaise", "tapis"
];

// Fallback questions from Amazon DB
let fallbackQuestions = [];
try {
  fallbackQuestions = JSON.parse(fs.readFileSync("server/db.json", "utf8"));
  console.log(`Loaded ${fallbackQuestions.length} fallback questions.`);
} catch (e) {
  console.log("Error loading db.json:", e.message);
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];

async function fetchFromEbay(keyword) {
  try {
    const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_ipg=60`;
    const { data } = await axios.get(url, { headers: { "User-Agent": USER_AGENTS[0] } });
    const $ = cheerio.load(data);
    const results = [];
    
    $("li.s-item").each((i, el) => {
      const title = $(el).find(".s-item__title").text();
      const priceStr = $(el).find(".s-item__price").text();
      const img = $(el).find(".s-item__image-img").attr("src");
      const ratingStr = $(el).find(".x-star-rating").text();
      
      if (!title || !priceStr || !img || title.includes("Shop on eBay")) return;
      
      const price = parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.'));
      const rating = ratingStr ? parseFloat(ratingStr.replace(',', '.')) : 4.5;
      
      if (!isNaN(price) && price > 0) {
        results.push({
          productName: title,
          reviewText: `Avis client (eBay): "Produit conforme à la description, livraison rapide et bon rapport qualité-prix."`,
          realRating: rating,
          price: price,
          images: [img],
          source: "eBay"
        });
      }
    });
    return results;
  } catch (e) {
    console.error("eBay Scraping Error:", e.message);
    return [];
  }
}

async function fetchFromCdiscount(keyword) {
  try {
    const url = `https://www.cdiscount.com/search/10/${encodeURIComponent(keyword)}.html`;
    const { data } = await axios.get(url, { headers: { "User-Agent": USER_AGENTS[1] } });
    const $ = cheerio.load(data);
    const results = [];
    
    $("li[data-sku]").each((i, el) => {
      const title = $(el).find(".prdtBTit").text() || $(el).find("h2").text();
      const priceEuro = $(el).find(".price").text() || $(el).find(".prdtPrice").text();
      const img = $(el).find(".prdtImg").attr("src") || $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
      
      if (!title || !priceEuro || !img) return;
      
      const price = parseFloat(priceEuro.replace(/[^0-9,]/g, '').replace(',', '.'));
      
      if (!isNaN(price) && price > 0) {
        results.push({
          productName: title.trim(),
          reviewText: `Avis client (Cdiscount): "Très satisfait de cet achat. Article de bonne qualité."`,
          realRating: 4.2,
          price: price,
          images: [img],
          source: "Cdiscount"
        });
      }
    });
    return results;
  } catch (e) {
    console.error("Cdiscount Scraping Error:", e.message);
    return [];
  }
}

async function fetchFromRakuten(keyword) {
  try {
    const url = `https://fr.shopping.rakuten.com/s/${encodeURIComponent(keyword)}`;
    const { data } = await axios.get(url, { headers: { "User-Agent": USER_AGENTS[2] } });
    const $ = cheerio.load(data);
    const results = [];
    
    $(".layoutProduct").each((i, el) => {
      const title = $(el).find("p").first().text();
      const priceStr = $(el).find("span").filter((i, e) => $(e).text().includes("€")).first().text();
      const img = $(el).find("img").attr("src");
      
      if (!title || !priceStr || !img) return;
      
      const price = parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.'));
      
      if (!isNaN(price) && price > 0) {
        results.push({
          productName: title.trim(),
          reviewText: `Avis client (Rakuten): "Vendeur sérieux, objet correspondant parfaitement à mes attentes."`,
          realRating: 4.8,
          price: price,
          images: [img],
          source: "Rakuten"
        });
      }
    });
    return results;
  } catch (e) {
    console.error("Rakuten Scraping Error:", e.message);
    return [];
  }
}

async function populateCache() {
  console.log("Populating cache...");
  const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
  const sites = [fetchFromEbay, fetchFromCdiscount, fetchFromRakuten];
  const siteFunc = sites[Math.floor(Math.random() * sites.length)];
  
  const results = await siteFunc(keyword);
  if (results.length > 0) {
    questionCache = [...questionCache, ...results];
    // Keep cache at reasonable size
    if (questionCache.length > 200) questionCache = questionCache.slice(-200);
    console.log(`Cache updated: ${questionCache.length} items available.`);
  }
}

// Initial populate
populateCache();
setInterval(populateCache, 2 * 60 * 1000); // Every 2 mins

function getQuestionsForRoom(count = 10) {
  if (questionCache.length < count) {
    console.log("Cache low, using fallback questions");
    return [...fallbackQuestions].sort(() => Math.random() - 0.5).slice(0, count);
  }
  const shuffled = [...questionCache].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

const safeCb = (cb, data) => {
    if (typeof cb === 'function') cb(data);
};

io.on("connection", (socket) => {
  socket.on("CREATE_ROOM", ({ pseudo, mode } = {}, callback) => {
    if (!pseudo || pseudo.trim().length === 0) return safeCb(callback, { error: "Pseudo invalide" });
    const code = generateRoomCode();
    const player = { id: socket.id, pseudo: pseudo.trim(), isHost: true, connected: true, score: 0 };
    
    const newRoom = {
      code, hostId: socket.id, state: "LOBBY", players: [player],
      currentQuestionIndex: 0, 
      questions: getQuestionsForRoom(10),
      mode: mode || "note",
      answers: {}, createdAt: Date.now()
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
      const oldId = existingPlayer.id;
      existingPlayer.id = socket.id;
      existingPlayer.connected = true;
      if (room.hostId === oldId) room.hostId = socket.id;
      if (room.answers[oldId]) {
        room.answers[socket.id] = room.answers[oldId];
        delete room.answers[oldId];
      }
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
    room.state = "PLAYING";
    room.currentQuestionIndex = 0;
    room.answers = {};
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
    if (room.mode === "note" || room.mode === "both") {
      score += Math.max(0, 1 - Math.abs(q.realRating - rating));
    }
    if (room.mode === "price" || room.mode === "both") {
      const diff = Math.abs(q.price - price) / q.price;
      score += Math.max(0, 1 - diff * 5); // Simple linear penalty
    }

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
    if (!room || room.hostId !== socket.id) return safeCb(callback, { error: "Non autorisé" });
    room.state = "PLAYING";
    room.currentQuestionIndex = 0;
    room.questions = getQuestionsForRoom(10);
    room.answers = {};
    room.players.forEach(p => p.score = 0);
    io.to(code).emit("ROOM_UPDATED", room);
    io.to(code).emit("GAME_STARTED");
    safeCb(callback, { success: true });
  });

  const handleLeave = () => {
    rooms.forEach((room, code) => {
      const p = room.players.find(pl => pl.id === socket.id);
      if (p) {
        p.connected = false;
        io.to(code).emit("ROOM_UPDATED", room);
      }
    });
  };

  socket.on("LEAVE_ROOM", () => {
    rooms.forEach((room, code) => {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        if (room.players.length === 0) rooms.delete(code);
        else if (room.hostId === socket.id) room.hostId = room.players[0].id;
        io.to(code).emit("ROOM_UPDATED", room);
      }
    });
  });

  socket.on("disconnect", () => handleLeave());
});

httpServer.on('request', (req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', cache: questionCache.length }));
  }
});

httpServer.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
