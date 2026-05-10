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

const KEYWORDS = [
  "smartphone", "clavier gaming", "souris sans fil", "casque bluetooth", "montre connectée",
  "drone 4k", "projecteur led", "chaise de bureau", "bureau gamer", "lampe design",
  "lego star wars", "figurine manga", "peluche geante", "jeu de societe", "carte pokemon",
  "cafetiere expresso", "aspirateur robot", "friteuse sans huile", "blender", "bouilloire",
  "tapis de yoga", "haltere", "velo electrique", "trottinette", "sac a dos",
  "parfum homme", "maquillage palette", "soin visage", "lisseur cheveux", "rasoir electrique",
  "body pillow", "coussin", "couette", "rideau", "miroir", "tableau deco",
  "guitare", "piano numerique", "micro studio", "enceinte jbl", "barre de son"
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
];

// Fallback questions from Amazon DB
let fallbackQuestions = [];
try {
  fallbackQuestions = JSON.parse(fs.readFileSync("server/db.json", "utf8"));
} catch (e) {}

async function scrapEbay(keyword) {
  try {
    const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_ipg=25`;
    const { data } = await axios.get(url, { headers: { "User-Agent": USER_AGENTS[0] }, timeout: 5000 });
    const $ = cheerio.load(data);
    const items = [];
    $("li.s-item").each((i, el) => {
      const title = $(el).find(".s-item__title").text();
      const priceStr = $(el).find(".s-item__price").text();
      const img = $(el).find(".s-item__image-img").attr("src");
      if (!title || !priceStr || !img || title.includes("Shop on eBay")) return;
      const price = parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.'));
      if (price > 5 && price < 2000) {
        items.push({ productName: title, reviewText: "Super produit, conforme à la description.", realRating: 4.5, price, images: [img], source: "eBay" });
      }
    });
    return items;
  } catch (e) { return []; }
}

async function scrapCdiscount(keyword) {
  try {
    const url = `https://www.cdiscount.com/search/10/${encodeURIComponent(keyword)}.html`;
    const { data } = await axios.get(url, { headers: { "User-Agent": USER_AGENTS[1] }, timeout: 5000 });
    const $ = cheerio.load(data);
    const items = [];
    $("li[data-sku]").each((i, el) => {
      const title = $(el).find(".prdtBTit").text() || $(el).find("h2").text();
      const priceEuro = $(el).find(".price").text() || $(el).find(".prdtPrice").text();
      const img = $(el).find(".prdtImg").attr("src") || $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
      if (!title || !priceEuro || !img) return;
      const price = parseFloat(priceEuro.replace(/[^0-9,]/g, '').replace(',', '.'));
      if (price > 5) items.push({ productName: title.trim(), reviewText: "Très bon rapport qualité prix.", realRating: 4.2, price, images: [img], source: "Cdiscount" });
    });
    return items;
  } catch (e) { return []; }
}

async function scrapRakuten(keyword) {
  try {
    const url = `https://fr.shopping.rakuten.com/s/${encodeURIComponent(keyword)}`;
    const { data } = await axios.get(url, { headers: { "User-Agent": USER_AGENTS[0] }, timeout: 5000 });
    const $ = cheerio.load(data);
    const items = [];
    $(".layoutProduct").each((i, el) => {
      const title = $(el).find("p").first().text();
      const priceStr = $(el).find("span").filter((i, e) => $(e).text().includes("€")).first().text();
      const img = $(el).find("img").attr("src");
      if (!title || !priceStr || !img) return;
      const price = parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.'));
      if (price > 5) items.push({ productName: title.trim(), reviewText: "Excellent produit, je recommande.", realRating: 4.7, price, images: [img], source: "Rakuten" });
    });
    return items;
  } catch (e) { return []; }
}

async function getRandomQuestions(count = 10) {
  const finalQuestions = [];
  const scrapers = [scrapEbay, scrapCdiscount, scrapRakuten];
  
  // Attempt to scrap multiple keywords in parallel
  const shuffledKeywords = [...KEYWORDS].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < 3 && finalQuestions.length < count; i++) {
    const keyword = shuffledKeywords[i];
    const siteFunc = scrapers[Math.floor(Math.random() * scrapers.length)];
    const results = await siteFunc(keyword);
    if (results.length > 0) {
      finalQuestions.push(...results.sort(() => Math.random() - 0.5).slice(0, 5));
    }
  }

  // If we still don't have enough, use fallbacks
  if (finalQuestions.length < count) {
    const remaining = count - finalQuestions.length;
    const fallbacks = [...fallbackQuestions].sort(() => Math.random() - 0.5).slice(0, remaining);
    finalQuestions.push(...fallbacks);
  }

  return finalQuestions.sort(() => Math.random() - 0.5).slice(0, count);
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

const safeCb = (cb, data) => { if (typeof cb === 'function') cb(data); };

io.on("connection", (socket) => {
  socket.on("CREATE_ROOM", async ({ pseudo, mode } = {}, callback) => {
    if (!pseudo || pseudo.trim().length === 0) return safeCb(callback, { error: "Pseudo invalide" });
    const code = generateRoomCode();
    const player = { id: socket.id, pseudo: pseudo.trim(), isHost: true, connected: true, score: 0 };
    
    const newRoom = {
      code, hostId: socket.id, state: "LOBBY", players: [player],
      currentQuestionIndex: 0, 
      questions: [], // Initially empty, will be populated before start
      isLoadingQuestions: true,
      mode: mode || "note",
      answers: {}, createdAt: Date.now()
    };
    rooms.set(code, newRoom);
    socket.join(code);
    safeCb(callback, { success: true, room: newRoom });

    // Background fetch 15 questions immediately
    console.log(`Room ${code}: Fetching questions...`);
    const qs = await getRandomQuestions(15);
    if (rooms.has(code)) {
      const r = rooms.get(code);
      r.questions = qs;
      r.isLoadingQuestions = false;
      io.to(code).emit("ROOM_UPDATED", r);
      console.log(`Room ${code}: Ready with ${qs.length} questions.`);
    }
  });

  socket.on("JOIN_ROOM", ({ code, pseudo } = {}, callback) => {
    const roomCode = code?.toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return safeCb(callback, { error: "Cette room n'existe pas." });
    
    const existingPlayer = room.players.find(p => p.pseudo.toLowerCase() === pseudo?.trim().toLowerCase());
    if (existingPlayer) {
      existingPlayer.id = socket.id;
      existingPlayer.connected = true;
      if (room.hostId === existingPlayer.id || room.hostId === undefined) room.hostId = socket.id;
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
    if (room.isLoadingQuestions || room.questions.length < 5) return safeCb(callback, { error: "Chargement des produits en cours... Attend 5 secondes." });
    
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

  socket.on("RESTART_GAME", async ({ code } = {}, callback) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return safeCb(callback, { error: "Non autorisé" });
    
    room.isLoadingQuestions = true;
    io.to(code).emit("ROOM_UPDATED", room);
    
    const qs = await getRandomQuestions(15);
    room.questions = qs;
    room.isLoadingQuestions = false;
    room.state = "PLAYING";
    room.currentQuestionIndex = 0;
    room.answers = {};
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

httpServer.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
