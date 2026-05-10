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

const KEYWORDS = [
  "iphone 15", "lego technic", "sac a main", "clavier mecanique gaming",
  "drone 4k", "body pillow", "peluche geante", "lampe design", "figurine funko pop",
  "velo electrique", "trottinette electrique", "casque gaming", "enceinte bluetooth",
  "aspirateur robot", "robot cuisine", "machine a cafe", "montre connectee",
  "chaise gaming", "ecouteurs sans fil", "camera gopro", "tablette samsung",
  "imprimante 3d", "telescopie", "telescope", "guitare electrique", "ukulele",
  "coussin xxl", "miroir deco", "horloge murale", "tapis poils longs"
];

const REVIEWS = [
  "Vraiment top, je recommande vivement !",
  "Conforme à la description, livraison rapide.",
  "Excellent rapport qualité-prix, très satisfait.",
  "Produit de bonne qualité, je suis impressionné.",
  "Parfait, mon fils est ravi du cadeau.",
  "Très bonne qualité, solide et bien finition.",
  "Livraison rapide, produit conforme. Top vendeur !",
  "Fonctionnel et bien conçu. Je rachèterai.",
  "Super produit ! Tout est parfait.",
  "Article reçu en parfait état, merci !"
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
];

const randomReview = () => REVIEWS[Math.floor(Math.random() * REVIEWS.length)];
const randomRating = () => Math.round((3.5 + Math.random() * 1.5) * 10) / 10;

function proxyImageUrl(url) {
  if (!url) return null;
  return `${SERVER_URL}/img?url=${encodeURIComponent(url)}`;
}

const http = axios.create({
  timeout: 10000,
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9',
    'Cache-Control': 'no-cache'
  }
});

async function scrapEbay(keyword) {
  try {
    const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_ipg=48&_sop=12`;
    const { data } = await http.get(url, { headers: { "User-Agent": USER_AGENTS[0] } });
    const $ = cheerio.load(data);
    const items = [];

    $("li.s-item").each((i, el) => {
      const title = $(el).find(".s-item__title").text().replace("Nouvelle annonce", "").trim();
      const priceStr = $(el).find(".s-item__price").first().text();
      // Try multiple img selectors - eBay can use different lazy-load attrs
      let img = $(el).find("img.s-item__image-img").attr("src")
               || $(el).find("img.s-item__image-img").attr("data-src")
               || $(el).find(".s-item__image img").attr("src")
               || $(el).find(".s-item__image img").attr("data-src");
      
      if (!title || !priceStr || !img || title.includes("Shop on eBay") || img.includes("s-l225")) {
        // s-l225 are tiny thumbnails, try to get bigger version
        if (img && img.includes("s-l225")) {
          img = img.replace("s-l225", "s-l500");
        } else if (!img) return;
      }
      
      // Upgrade image quality
      if (img) img = img.replace(/s-l\d+/, "s-l500");

      const price = parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.'));
      if (!isNaN(price) && price > 5 && price < 5000) {
        items.push({
          productName: title,
          reviewText: randomReview(),
          realRating: randomRating(),
          price,
          images: [proxyImageUrl(img)],
          source: "eBay"
        });
      }
    });

    console.log(`eBay "${keyword}": ${items.length} items`);
    return items;
  } catch (e) {
    console.error(`eBay Error for "${keyword}": ${e.message}`);
    return [];
  }
}

async function scrapCdiscount(keyword) {
  try {
    const url = `https://www.cdiscount.com/search/10/${encodeURIComponent(keyword)}.html?orderby=2`;
    const { data } = await http.get(url, { headers: { "User-Agent": USER_AGENTS[1] } });
    const $ = cheerio.load(data);
    const items = [];

    $("li[data-sku], .lpProductList article").each((i, el) => {
      const title = $(el).find(".prdtBTit, h2, .titleWrapper").first().text().trim();
      const priceText = $(el).find(".price, .prdtPrice, .price__amount").first().text().trim();
      let img = $(el).find(".prdtImg, img.lazyload, img").first().attr("data-src")
             || $(el).find(".prdtImg, img.lazyload, img").first().attr("src");
      
      if (!title || !priceText || !img) return;
      if (img.startsWith("//")) img = "https:" + img;

      const price = parseFloat(priceText.replace(/[^0-9,]/g, '').replace(',', '.'));
      if (!isNaN(price) && price > 5 && price < 5000) {
        items.push({
          productName: title,
          reviewText: randomReview(),
          realRating: randomRating(),
          price,
          images: [proxyImageUrl(img)],
          source: "Cdiscount"
        });
      }
    });

    console.log(`Cdiscount "${keyword}": ${items.length} items`);
    return items;
  } catch (e) {
    console.error(`Cdiscount Error for "${keyword}": ${e.message}`);
    return [];
  }
}

async function getRandomQuestions(count = 12) {
  let finalQuestions = [];
  const shuffled = [...KEYWORDS].sort(() => Math.random() - 0.5);
  
  // Fetch 3 different keywords in parallel for speed
  const batches = [shuffled.slice(0, 2), shuffled.slice(2, 4), shuffled.slice(4, 6)];
  
  for (const batch of batches) {
    if (finalQuestions.length >= count) break;
    const promises = batch.flatMap(kw => [scrapEbay(kw), scrapCdiscount(kw)]);
    const results = await Promise.all(promises);
    results.forEach(items => finalQuestions.push(...items));
  }

  // Deduplicate by title similarity
  const seen = new Set();
  finalQuestions = finalQuestions.filter(q => {
    const key = q.productName.slice(0, 30).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

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
      currentQuestionIndex: 0, questions: [], isLoadingQuestions: true,
      mode: mode || "note", answers: {}, createdAt: Date.now()
    };
    rooms.set(code, newRoom);
    socket.join(code);
    safeCb(callback, { success: true, room: newRoom });

    try {
      const qs = await getRandomQuestions(12);
      if (rooms.has(code)) {
        const r = rooms.get(code);
        r.questions = qs;
        r.isLoadingQuestions = false;
        io.to(code).emit("ROOM_UPDATED", r);
        console.log(`Room ${code} ready: ${qs.length} questions`);
      }
    } catch (err) { console.error(err); }
  });

  socket.on("JOIN_ROOM", ({ code, pseudo } = {}, callback) => {
    const roomCode = code?.toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return safeCb(callback, { error: "Cette room n'existe pas." });
    const existing = room.players.find(p => p.pseudo.toLowerCase() === pseudo?.trim().toLowerCase());
    if (existing) {
      existing.id = socket.id; existing.connected = true;
      if (!room.hostId) room.hostId = socket.id;
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
    if (!room.questions || room.questions.length === 0) return safeCb(callback, { error: "Chargement en cours..." });
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

  socket.on("disconnect", () => {
    rooms.forEach((room, code) => {
      const p = room.players.find(pl => pl.id === socket.id);
      if (p) { p.connected = false; io.to(code).emit("ROOM_UPDATED", room); }
    });
  });
});

// HTTP request handler: health + IMAGE PROXY
httpServer.on('request', async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  
  // Image proxy endpoint - bypasses hotlink protection
  if (urlObj.pathname === '/img') {
    const target = urlObj.searchParams.get('url');
    if (!target) { res.writeHead(400); res.end(); return; }
    try {
      const response = await axios.get(target, {
        responseType: 'stream',
        timeout: 8000,
        headers: {
          'User-Agent': USER_AGENTS[0],
          'Referer': new URL(target).origin,
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        }
      });
      res.writeHead(200, {
        'Content-Type': response.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      });
      response.data.pipe(res);
    } catch (e) {
      res.writeHead(404);
      res.end();
    }
    return;
  }

  if (urlObj.pathname === '/health' || urlObj.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
    return;
  }

  res.writeHead(404); res.end();
});

httpServer.listen(PORT, "0.0.0.0", () => console.log(`🚀 Serveur démarré sur ${PORT}`));
