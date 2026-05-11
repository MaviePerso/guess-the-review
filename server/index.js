import { Server } from "socket.io";
import { createServer } from "http";
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;
const rooms = new Map();
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
const DB_PATH = path.join(process.cwd(), 'db_scraped.json');

// Memory cache + Persistent File
let questionDatabase = [];

// Load existing database
if (fs.existsSync(DB_PATH)) {
  try {
    questionDatabase = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    console.log(`[DB] Loaded ${questionDatabase.length} items from disk.`);
  } catch (e) {
    console.error("[DB] Error loading file, starting fresh.");
  }
}

const KEYWORDS = [
  "iphone 15", "lego star wars", "clavier gaming", "drone dji", "body pillow", "peluche pokemon", 
  "lampe sunset", "figurine funko pop", "velo electrique", "casque bose", "enceinte marshall", 
  "aspirateur dyson", "robot cuisine", "machine a cafe", "montre seiko", "sac eastpak",
  "carte rtx 4080", "souris razer", "moniteur msi", "chaise gaming", "ssd samsung",
  "ps5 console", "switch oled", "xbox series", "jeu plateau", "puzzle 1000",
  "guitare yamaha", "clavier piano", "micro rode", "appareil photo sony",
  "sacoche lacoste", "baskets nike air", "veste north face", "lunettes rayban",
  "barbecue gaz", "jacuzzi gonflable", "tente camping", "sac couchage",
  "machine a laver", "lave vaisselle", "frigo americain", "micro ondes"
];

const REVIEWS = [
  "Vraiment top, je recommande vivement !", "Conforme à la description, livraison rapide.",
  "Excellent rapport qualité-prix, très satisfait.", "Produit de bonne qualité, je suis impressionné.",
  "Parfait, mon fils est ravi du cadeau.", "Très bonne qualité, solide et bien fini.",
  "Livraison rapide, produit conforme. Top vendeur !", "Fonctionnel et bien conçu.",
  "Super produit ! Tout est parfait.", "Article reçu en parfait état, merci !"
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomReview = () => rand(REVIEWS);
const randomRating = () => Math.round((3.5 + Math.random() * 1.5) * 10) / 10;

function proxyImageUrl(url) {
  if (!url) return null;
  return `${SERVER_URL}/img?url=${encodeURIComponent(url)}`;
}

const http = axios.create({
  timeout: 10000,
  headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8', 'Accept-Language': 'fr-FR,fr;q=0.9' }
});

async function scrapEbay(keyword) {
  try {
    const page = Math.floor(Math.random() * 5) + 1;
    const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_pgn=${page}&_ipg=48`;
    const { data } = await http.get(url, { headers: { "User-Agent": rand(USER_AGENTS) } });
    const $ = cheerio.load(data);
    const items = [];
    $("li.s-item").each((i, el) => {
      const title = $(el).find(".s-item__title").text().replace("Nouvelle annonce", "").trim();
      const priceStr = $(el).find(".s-item__price").first().text();
      let img = $(el).find("img.s-item__image-img").attr("src") || $(el).find("img.s-item__image-img").attr("data-src");
      if (!title || !priceStr || !img || title.includes("Shop on eBay")) return;
      img = img.replace(/s-l\d+/, "s-l500");
      const price = parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.'));
      if (!isNaN(price) && price > 5) items.push({ productName: title, reviewText: randomReview(), realRating: randomRating(), price, images: [img], source: "eBay" });
    });
    return items;
  } catch (e) { return []; }
}

async function scrapCdiscount(keyword) {
  try {
    const page = Math.floor(Math.random() * 3) + 1;
    const url = `https://www.cdiscount.com/search/10/${encodeURIComponent(keyword)}.html?p=${page}`;
    const { data } = await http.get(url, { headers: { "User-Agent": rand(USER_AGENTS) } });
    const $ = cheerio.load(data);
    const items = [];
    $("li[data-sku]").each((i, el) => {
      const title = $(el).find(".prdtBTit").first().text().trim() || $(el).find("h2").first().text().trim();
      const priceText = $(el).find(".price").first().text().trim();
      let img = $(el).find("img").first().attr("data-src") || $(el).find("img").first().attr("src");
      if (!title || !priceText || !img) return;
      if (img.startsWith("//")) img = "https:" + img;
      const price = parseFloat(priceText.replace(/[^0-9,]/g, '').replace(',', '.'));
      if (!isNaN(price) && price > 5) items.push({ productName: title, reviewText: randomReview(), realRating: randomRating(), price, images: [img], source: "Cdiscount" });
    });
    return items;
  } catch (e) { return []; }
}

async function updateDatabase() {
  const keyword = rand(KEYWORDS);
  console.log(`[DB] Scraping for: ${keyword}`);
  const [ebay, cdis] = await Promise.all([scrapEbay(keyword), scrapCdiscount(keyword)]);
  const newItems = [...ebay, ...cdis];
  
  if (newItems.length > 0) {
    const seenTitles = new Set(questionDatabase.map(q => q.productName.slice(0, 40).toLowerCase()));
    const unique = newItems.filter(item => {
      const key = item.productName.slice(0, 40).toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });
    
    if (unique.length > 0) {
        questionDatabase = [...questionDatabase, ...unique];
        // Keep max 5000 items in file to avoid huge memory usage, but it grows over time
        if (questionDatabase.length > 5000) questionDatabase = questionDatabase.slice(-5000);
        
        fs.writeFileSync(DB_PATH, JSON.stringify(questionDatabase, null, 2));
        console.log(`[DB] Saved ${unique.length} new items. Total: ${questionDatabase.length}`);
    }
  }
}

// Start continuous updates
setInterval(updateDatabase, 60 * 1000); // Every 1 min
updateDatabase(); // First run

function getQuestions(count = 12) {
  if (questionDatabase.length < count) return [];
  const shuffled = [...questionDatabase].sort(() => Math.random() - 0.5);
  // Re-proxy images when serving (since SERVER_URL might change)
  return shuffled.slice(0, count).map(q => ({
    ...q,
    images: q.images.map(img => img.startsWith('http') && !img.includes('/img?url=') ? proxyImageUrl(img) : img)
  }));
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
      currentQuestionIndex: 0, questions: qs, isLoadingQuestions: qs.length === 0,
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
      const wasHost = room.hostId === existing.id;
      existing.id = socket.id; existing.connected = true;
      if (wasHost) room.hostId = socket.id;
      socket.join(roomCode);
      safeCb(callback, { success: true, room });
      io.to(roomCode).emit("ROOM_UPDATED", room);
      return;
    }
    const player = { id: socket.id, pseudo: pseudo?.trim() || "Joueur", isHost: false, connected: true, score: 0 };
    room.players.push(player);
    socket.join(roomCode);
    safeCb(callback, { success: true, room });
    io.to(roomCode).emit("ROOM_UPDATED", room);
  });

  socket.on("START_GAME", ({ code } = {}, callback) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return safeCb(callback, { error: "Non autorisé" });
    if (!room.questions || room.questions.length === 0) return safeCb(callback, { error: "Base de données vide... Attend 10s." });
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

// HTTP: health + IMAGE PROXY
httpServer.on('request', async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  if (urlObj.pathname === '/img') {
    const target = urlObj.searchParams.get('url');
    if (!target) { res.writeHead(400); res.end(); return; }
    try {
      const response = await axios.get(target, { responseType: 'stream', timeout: 8000, headers: { 'User-Agent': USER_AGENTS[0], 'Referer': new URL(target).origin + "/", 'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8' } });
      res.writeHead(200, { 'Content-Type': response.headers['content-type'] || 'image/jpeg', 'Cache-Control': 'public, max-age=7200', 'Access-Control-Allow-Origin': '*' });
      response.data.pipe(res);
    } catch (e) { res.writeHead(404); res.end(); }
    return;
  }
  if (urlObj.pathname === '/health' || urlObj.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', items: questionDatabase.length }));
    return;
  }
  res.writeHead(404); res.end();
});

httpServer.listen(PORT, "0.0.0.0", () => console.log(`🚀 Serveur démarré port ${PORT}`));
