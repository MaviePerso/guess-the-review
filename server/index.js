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
  "iphone 15", "lego", "sac a main luxe", "clavier meca", "carte graphique", "ssd 2to",
  "drone dji", "body pillow anime", "peluche pokemon", "lampe sunset", "figurine pop",
  "velo gravel", "trottinette electrique", "casque bose", "enceinte marshall",
  "aspirateur dyson", "robot cuisine", "machine a cafe", "montre seiko", "sac eastpak"
];

const EMERGENCY_DB = [
    { productName: "Console PlayStation 5 Slim", reviewText: "Super console, très rapide et silencieuse.", realRating: 4.8, price: 549, images: ["https://g-tt.com/wp-content/uploads/2023/10/ps5-slim.jpg"], source: "Emergency" },
    { productName: "iPhone 15 Pro Max 256Go", reviewText: "L'écran est magnifique, photos incroyables.", realRating: 4.7, price: 1479, images: ["https://m.media-amazon.com/images/I/81+GIkwqLIL._AC_UF1000,1000_QL80_.jpg"], source: "Emergency" },
    { productName: "Velo Electrique VanMoof S3", reviewText: "Le design est top, l'assistance électrique est fluide.", realRating: 4.3, price: 2498, images: ["https://www.vanmoof.com/static/version1620815124/frontend/VanMoof/default/en_US/images/s3-dark.png"], source: "Emergency" },
    { productName: "Lego Star Wars Millenium Falcon", reviewText: "Un plaisir à monter, immense une fois fini !", realRating: 4.9, price: 849, images: ["https://m.media-amazon.com/images/I/91tK96v6T7L._AC_SL1500_.jpg"], source: "Emergency" },
    { productName: "Casque Bose QuietComfort 45", reviewText: "La réduction de bruit est la meilleure du marché.", realRating: 4.6, price: 269, images: ["https://m.media-amazon.com/images/I/51JbsHSktkL._AC_SL1500_.jpg"], source: "Emergency" }
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
];

const http = axios.create({
    timeout: 8000,
    headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
    }
});

async function scrapEbay(keyword) {
  try {
    const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_ipg=25`;
    const { data } = await http.get(url, { headers: { "User-Agent": USER_AGENTS[0] } });
    const $ = cheerio.load(data);
    const items = [];
    $("li.s-item").each((i, el) => {
      const title = $(el).find(".s-item__title").text();
      const priceStr = $(el).find(".s-item__price").text();
      let img = $(el).find(".s-item__image-img").attr("src") || $(el).find(".s-item__image-img").attr("data-src");
      if (!title || !priceStr || !img || title.includes("Shop on eBay")) return;
      const price = parseFloat(priceStr.replace(/[^0-9,]/g, '').replace(',', '.'));
      if (price > 5) items.push({ productName: title, reviewText: "Top ! Conforme et bien emballé.", realRating: 4.5, price, images: [img], source: "eBay" });
    });
    return items;
  } catch (e) { return []; }
}

async function scrapCdiscount(keyword) {
  try {
    const url = `https://www.cdiscount.com/search/10/${encodeURIComponent(keyword)}.html`;
    const { data } = await http.get(url, { headers: { "User-Agent": USER_AGENTS[1] } });
    const $ = cheerio.load(data);
    const items = [];
    $("li[data-sku]").each((i, el) => {
      const title = $(el).find(".prdtBTit").text() || $(el).find("h2").text();
      const priceEuro = $(el).find(".price").text() || $(el).find(".prdtPrice").text();
      let img = $(el).find(".prdtImg").attr("src") || $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
      if (!title || !priceEuro || !img) return;
      const price = parseFloat(priceEuro.replace(/[^0-9,]/g, '').replace(',', '.'));
      if (price > 5) items.push({ productName: title.trim(), reviewText: "Bon produit, conforme aux attentes.", realRating: 4.0, price, images: [img], source: "Cdiscount" });
    });
    return items;
  } catch (e) { return []; }
}

async function getRandomQuestions(count = 10) {
  let finalQuestions = [];
  const shuffledKeywords = [...KEYWORDS].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < 3 && finalQuestions.length < count; i++) {
    const keyword = shuffledKeywords[i];
    const [ebay, cdis] = await Promise.all([scrapEbay(keyword), scrapCdiscount(keyword)]);
    finalQuestions = [...finalQuestions, ...ebay, ...cdis];
  }

  if (finalQuestions.length < count) {
      finalQuestions = [...finalQuestions, ...EMERGENCY_DB];
  }

  return finalQuestions.sort(() => Math.random() - 0.5).slice(0, count);
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
        const qs = await getRandomQuestions(15);
        if (rooms.has(code)) {
            const r = rooms.get(code);
            r.questions = qs;
            r.isLoadingQuestions = false;
            io.to(code).emit("ROOM_UPDATED", r);
        }
    } catch (err) { console.error(err); }
  });

  socket.on("JOIN_ROOM", ({ code, pseudo } = {}, callback) => {
    const roomCode = code?.toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return safeCb(callback, { error: "Cette room n'existe pas." });
    
    const existingPlayer = room.players.find(p => p.pseudo.toLowerCase() === pseudo?.trim().toLowerCase());
    if (existingPlayer) {
      existingPlayer.id = socket.id;
      existingPlayer.connected = true;
      if (room.hostId === undefined) room.hostId = socket.id;
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
    if (room.questions.length === 0) return safeCb(callback, { error: "Recherche de produits en cours..." });
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

httpServer.on('request', (req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
  }
});

httpServer.listen(PORT, "0.0.0.0", () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
