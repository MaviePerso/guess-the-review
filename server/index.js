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

// Very large and diverse keyword list
const KEYWORDS = [
  "body pillow", "led strip gaming", "bureau d'angle", "chaise gaming", "casque vr",
  "dumbbell hexagonal", "tapis de sol yoga", "rameur appartement", "punching ball",
  "lampe projecteur aurore", "guirlande lumineuse noel", "miroir led salle de bain",
  "tableau abstrait", "plante artificielle", "fontaine interieure zen",
  "machine a coudre", "pistolet massage", "couverture pondérée", "masque sommeil",
  "humidificateur air", "purificateur d'air", "ventilateur colonne", "radiateur bain d'huile",
  "mini frigo", "grille pain inox", "blender chauffant", "yaourtiere", "machine pain",
  "popcorn machine", "gaufrier", "crepiere", "plancha electrique", "sorbetiere",
  "kit sushi", "ramen bowl", "service the", "cafetiere piston", "machine expresso",
  "ukulele soprano", "kalimba", "beatbox portable", "vinyle", "platine disque",
  "kit baterie electronique", "ocarina", "carnets bullet journal", "stylos aquarelle",
  "toile peinture", "kit macrame", "loom bracelet", "puzzle 1000 pieces",
  "micro espion", "camera surveillance wifi", "serrure connectee", "sonnette video",
  "station meteo", "telescope debutant", "microscope enfant", "globe lumineux",
  "drone fpv", "voiture rc drift", "bateau rc", "helico rc",
  "jeu de cartes pokemon booster", "figurine one piece", "statue demon slayer",
  "cosplay perruque", "manteau laine femme", "body maillot", "chaussettes droles",
  "sac banane", "portefeuille rfid", "montre analogique", "bague ajustable",
  "gemmes pierres naturelles", "cristaux lithotherapie", "bougie parfumee",
  "diffuseur huiles essentielles", "kit meditation", "livre chakra",
  "brosse demelante", "seche cheveux ionique", "lisseur vapeur", "curling wand",
  "kit manucure gel", "faux ongles", "gel uv nail art",
  "baskets compensees", "sandales spartiates", "bottines chelsea",
  "veilleuse bebe", "baby monitor", "tente tipi enfant", "kit peinture enfant",
  "skateboard debutant", "trottinette enfant", "kart pedales enfant"
];

const REVIEWS = [
  "Produit reçu rapidement, très conforme à la description !",
  "Super qualité, je suis bluffé pour ce prix.",
  "Livraison express, emballage soigné. Parfait !",
  "Mon fils adore, c'était le cadeau idéal.",
  "Franchement top, je recommande sans hésiter.",
  "Exactement ce que je cherchais depuis longtemps.",
  "Très bonne finition, solide et bien conçu.",
  "Rapport qualité-prix imbattable, satisfait à 100%.",
  "Fonctionne parfaitement, rien à redire.",
  "Je suis agréablement surpris par la qualité.",
  "Belle surprise ! Je pensais pas que ce serait aussi bien.",
  "Commande reçue en 2 jours, produit nickel.",
  "Conforme aux photos, très content de mon achat.",
  "Très bon produit, ma femme est ravie.",
  "Parfait pour faire un cadeau, présentation soignée."
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0"
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomReview = () => rand(REVIEWS);
const randomRating = () => Math.round((3.2 + Math.random() * 1.8) * 10) / 10;
const randomPage = (max = 4) => Math.floor(Math.random() * max) + 1;

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

// Pick N random items from array
function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function scrapEbay(keyword) {
  try {
    // Random page (1-4) so we don't always get the same top items
    const page = randomPage(4);
    const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_pgn=${page}&_ipg=48`;
    const { data } = await http.get(url, { 
      headers: { "User-Agent": rand(USER_AGENTS) } 
    });
    const $ = cheerio.load(data);
    const items = [];

    $("li.s-item").each((i, el) => {
      const title = $(el).find(".s-item__title").text().replace("Nouvelle annonce", "").trim();
      const priceStr = $(el).find(".s-item__price").first().text();
      let img = $(el).find("img.s-item__image-img").attr("src")
               || $(el).find("img.s-item__image-img").attr("data-src")
               || $(el).find(".s-item__image img").attr("src")
               || $(el).find(".s-item__image img").attr("data-src");

      if (!title || !priceStr || !img || title.includes("Shop on eBay")) return;

      // Upgrade to higher res
      img = img.replace(/s-l\d+\.(jpg|png|webp)/i, "s-l500.$1").replace(/s-l\d+/i, "s-l500");

      const price = parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.'));
      if (!isNaN(price) && price > 3 && price < 5000) {
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

    // Pick random subset so we get variety across calls
    const picked = pickRandom(items, 3);
    console.log(`eBay p${page} "${keyword}": ${items.length} found, ${picked.length} picked`);
    return picked;
  } catch (e) {
    console.error(`eBay Error "${keyword}": ${e.message}`);
    return [];
  }
}

async function scrapCdiscount(keyword) {
  try {
    const page = randomPage(3);
    const url = `https://www.cdiscount.com/search/10/${encodeURIComponent(keyword)}.html?p=${page}`;
    const { data } = await http.get(url, { 
      headers: { "User-Agent": rand(USER_AGENTS) } 
    });
    const $ = cheerio.load(data);
    const items = [];

    $("li[data-sku]").each((i, el) => {
      const title = $(el).find(".prdtBTit").first().text().trim() 
                 || $(el).find("h2").first().text().trim();
      const priceText = $(el).find(".price").first().text().trim()
                     || $(el).find(".prdtPrice").first().text().trim();
      let img = $(el).find("img").first().attr("data-src")
             || $(el).find("img").first().attr("src");

      if (!title || !priceText || !img) return;
      if (img.startsWith("//")) img = "https:" + img;

      const price = parseFloat(priceText.replace(/[^0-9,]/g, '').replace(',', '.'));
      if (!isNaN(price) && price > 3 && price < 5000) {
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

    const picked = pickRandom(items, 3);
    console.log(`Cdiscount p${page} "${keyword}": ${items.length} found, ${picked.length} picked`);
    return picked;
  } catch (e) {
    console.error(`Cdiscount Error "${keyword}": ${e.message}`);
    return [];
  }
}

async function getRandomQuestions(count = 12) {
  // Pick completely random keywords for this room - guaranteed different each time
  const selectedKeywords = pickRandom(KEYWORDS, 8);
  let allItems = [];

  // Run all scrapes in parallel for speed
  const promises = selectedKeywords.flatMap(kw => [
    scrapEbay(kw),
    scrapCdiscount(kw)
  ]);
  
  const results = await Promise.allSettled(promises);
  results.forEach(r => { if (r.status === 'fulfilled') allItems.push(...r.value); });

  // Deduplicate by first 25 chars of title
  const seen = new Set();
  allItems = allItems.filter(q => {
    const key = q.productName.slice(0, 25).toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Total unique items scraped: ${allItems.length}`);
  
  // Final random shuffle and slice
  return allItems.sort(() => Math.random() - 0.5).slice(0, count);
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
    } catch (err) { console.error("Room error:", err); }
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
        headers: {
          'User-Agent': USER_AGENTS[0],
          'Referer': new URL(target).origin + "/",
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        }
      });
      res.writeHead(200, {
        'Content-Type': response.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'public, max-age=7200',
        'Access-Control-Allow-Origin': '*'
      });
      response.data.pipe(res);
    } catch (e) {
      res.writeHead(404); res.end();
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

httpServer.listen(PORT, "0.0.0.0", () => console.log(`🚀 Serveur démarré port ${PORT}`));
