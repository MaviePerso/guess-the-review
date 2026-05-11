import { Server } from "socket.io";
import { createServer } from "http";
import axios from 'axios';
import * as cheerio from 'cheerio';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;
const rooms = new Map();
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// Global cache to make game starts INSTANT
let globalQuestionCache = [];

const KEYWORDS = [
  "iphone 15", "lego star wars", "sac a main luxe", "clavier gaming mecanique",
  "drone dji mini", "body pillow anime", "peluche pokemon", "lampe sunset led", 
  "figurine funko pop", "velo gravel", "trottinette electrique xiaomi", "casque bose qc45",
  "enceinte marshall", "aspirateur dyson v15", "robot cuisine moulinex", "machine a cafe delonghi",
  "montre connectee apple", "chaise gaming secretlab", "ecouteurs airpods", "camera gopro hero 12",
  "tablette ipad pro", "imprimante 3d creality", "telescope celestron", "guitare electrique fender",
  "piano numerique yamaha", "console ps5 slim", "nintendo switch oled", "xbox series x",
  "coussin de voyage", "miroir lumineux", "horloge design", "tapis salon moderne",
  "jouet chien interactif", "arbre a chat", "aquarium led", "kit barbecue",
  "piscine gonflable", "transat jardin", "hamac", "parasol", "valise samsonite"
];

const REVIEWS = [
  "Vraiment top, je recommande vivement !",
  "Conforme à la description, livraison rapide.",
  "Excellent rapport qualité-prix, très satisfait.",
  "Produit de bonne qualité, je suis impressionné.",
  "Parfait, mon fils est ravi du cadeau.",
  "Très bonne qualité, solide et bien fini.",
  "Livraison rapide, produit conforme. Top vendeur !",
  "Fonctionnel et bien conçu. Je rachèterai.",
  "Super produit ! Tout est parfait.",
  "Article reçu en parfait état, merci !"
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
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9'
  }
});

async function scrapEbay(keyword) {
  try {
    const page = Math.floor(Math.random() * 3) + 1;
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
      if (!isNaN(price) && price > 5 && price < 5000) {
        items.push({ productName: title, reviewText: randomReview(), realRating: randomRating(), price, images: [proxyImageUrl(img)], source: "eBay" });
      }
    });
    return items;
  } catch (e) { return []; }
}

async function scrapCdiscount(keyword) {
  try {
    const page = Math.floor(Math.random() * 2) + 1;
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
      if (!isNaN(price) && price > 5 && price < 5000) {
        items.push({ productName: title, reviewText: randomReview(), realRating: randomRating(), price, images: [proxyImageUrl(img)], source: "Cdiscount" });
      }
    });
    return items;
  } catch (e) { return []; }
}

async function populateGlobalCache() {
  const keyword = rand(KEYWORDS);
  console.log(`[Cache] Background scraping for: ${keyword}`);
  const [ebay, cdis] = await Promise.all([scrapEbay(keyword), scrapCdiscount(keyword)]);
  const newItems = [...ebay, ...cdis];
  
  if (newItems.length > 0) {
    // Deduplicate by title
    const seen = new Set(globalQuestionCache.map(q => q.productName.slice(0, 30)));
    const unique = newItems.filter(item => {
      const key = item.productName.slice(0, 30);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    globalQuestionCache = [...globalQuestionCache, ...unique];
    if (globalQuestionCache.length > 300) globalQuestionCache = globalQuestionCache.slice(-300);
    console.log(`[Cache] Updated. Total items: ${globalQuestionCache.length}`);
  }
}

// Start cache population immediately
populateGlobalCache();
setInterval(populateGlobalCache, 60 * 1000); // Every 1 min

function getQuestionsFromCache(count = 12) {
  if (globalQuestionCache.length < count) return [];
  const shuffled = [...globalQuestionCache].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const safeCb = (cb, data) => { if (typeof cb === 'function') cb(data); };

io.on("connection", (socket) => {
  socket.on("CREATE_ROOM", async ({ pseudo, mode } = {}, callback) => {
    if (!pseudo || pseudo.trim().length === 0) return safeCb(callback, { error: "Pseudo invalide" });
    const code = generateRoomCode();
    const player = { id: socket.id, pseudo: pseudo.trim(), isHost: true, connected: true, score: 0 };
    
    // Get questions INSTANTLY if cache has enough
    let qs = getQuestionsFromCache(12);
    
    const newRoom = {
      code, hostId: socket.id, state: "LOBBY", players: [player],
      currentQuestionIndex: 0, 
      questions: qs, 
      isLoadingQuestions: qs.length === 0,
      mode: mode || "note", answers: {}, createdAt: Date.now()
    };
    rooms.set(code, newRoom);
    socket.join(code);
    safeCb(callback, { success: true, room: newRoom });

    // If cache was too small, wait for first items
    if (qs.length === 0) {
        console.log(`Room ${code} waiting for cache...`);
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            const newQs = getQuestionsFromCache(12);
            if (newQs.length > 0 || attempts > 20) {
                clearInterval(interval);
                const r = rooms.get(code);
                if (r) {
                    r.questions = newQs.length > 0 ? newQs : [];
                    r.isLoadingQuestions = false;
                    io.to(code).emit("ROOM_UPDATED", r);
                }
            }
        }, 2000);
    }
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
    if (!room.questions || room.questions.length === 0) return safeCb(callback, { error: "Chargement en cours... Attend un peu." });
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
    room.questions = getQuestionsFromCache(12);
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
      const response = await axios.get(target, {
        responseType: 'stream',
        timeout: 8000,
        headers: { 'User-Agent': USER_AGENTS[0], 'Referer': new URL(target).origin + "/", 'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8' }
      });
      res.writeHead(200, { 'Content-Type': response.headers['content-type'] || 'image/jpeg', 'Cache-Control': 'public, max-age=7200', 'Access-Control-Allow-Origin': '*' });
      response.data.pipe(res);
    } catch (e) { res.writeHead(404); res.end(); }
    return;
  }
  if (urlObj.pathname === '/health' || urlObj.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', cache: globalQuestionCache.length }));
    return;
  }
  res.writeHead(404); res.end();
});

httpServer.listen(PORT, "0.0.0.0", () => console.log(`🚀 Serveur démarré port ${PORT}`));
