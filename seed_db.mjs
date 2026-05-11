import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const KEYWORDS = [
  "iphone 15", "ps5", "lego star wars", "drone dji", "body pillow", "peluche pokemon",
  "clavier mecanique", "carte graphique rtx", "baskets nike", "sac a main luxe",
  "velo electrique", "trottinette electrique", "aspirateur robot", "machine a cafe",
  "casque bluetooth", "enceinte jbl", "montre seiko", "smartwatch", "ipad pro",
  "figurine pop", "chaise gaming", "souris logitech", "ecran gamer", "ssd 1to",
  "nintendo switch", "xbox series x", "guitare electrique", "clavier piano",
  "telescope", "microscope", "appareil photo canon", "sac a dos", "lunettes soleil",
  "montre connectee", "rasoir electrique", "seche cheveux", "lisseur", "epilateur",
  "balance connectee", "thermomix", "air fryer", "multicuiseur", "machine a pain",
  "grille pain", "bouilloire design", "presse agrume", "extracteur de jus",
  "sorbetiere", "appareil a raclette", "fondue", "crepiere", "gaufrier",
  "batterie de cuisine", "couteau ceramique", "verre a vin", "service vaisselle",
  "set de table", "nappe lin", "coussin velours", "plaid polaire", "tapis salon",
  "miroir soleil", "cadre photo", "bougie parfumee", "vase ceramique",
  "plante artificielle", "guirlande led", "lampe de chevet", "applique murale",
  "suspension rotin", "fauteuil crapaud", "pouf tricot", "bout de canape",
  "table basse bois", "etagere murale", "bibliotheque", "bureau scandinave",
  "organisateur bureau", "tapis de souris xxl", "support moniteur",
  "cable usb-c", "powerbank", "chargeur induction", "enceinte connectee",
  "barre de son", "home cinema", "videoprojecteur", "ecran de projection",
  "platine vinyle", "casque audio hifi", "amplificateur", "dac audio",
  "clavier maitre", "carte son", "microphone condensateur", "casque studio",
  "moniteur studio", "synthetiseur", "boite a rythme", "controleur dj"
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomReview = () => "Top ! Conforme et bien emballé.";
const randomRating = () => Math.round((3.5 + Math.random() * 1.5) * 10) / 10;

async function scrapEbay(keyword) {
  try {
    const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_ipg=48`;
    const { data } = await axios.get(url, { headers: { "User-Agent": rand(USER_AGENTS) }, timeout: 5000 });
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

async function run() {
  let db = [];
  console.log("Starting massive seed...");
  for (let i = 0; i < KEYWORDS.length; i++) {
    const kw = KEYWORDS[i];
    process.stdout.write(`Scraping ${i+1}/${KEYWORDS.length}: ${kw}... `);
    const results = await scrapEbay(kw);
    db = [...db, ...results];
    console.log(`${results.length} found.`);
    if (db.length > 2000) break;
  }
  
  // Deduplicate
  const seen = new Set();
  const final = db.filter(item => {
    const key = item.productName.slice(0, 30).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  fs.writeFileSync('db_scraped.json', JSON.stringify(final, null, 2));
  console.log(`Finished! Saved ${final.length} products to db_scraped.json`);
}

run();
