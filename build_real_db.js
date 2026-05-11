const fs = require('fs');

console.log("Lecture de bestbuy.json...");
const rawData = fs.readFileSync('bestbuy.json', 'utf8');

// bestbuy.json is a file with line-separated JSON objects, or maybe an array.
// Let's check how it's formatted. In the preview earlier:
// {"sku":1003269,"name":...},
// It seems it's a JSON array but maybe missing brackets or just line by line.
// Let's parse it safely.
let products = [];
try {
  // Try parsing as standard array first
  products = JSON.parse(rawData);
} catch (e) {
  // If it's a list of objects separated by commas, fix it
  try {
    let fixed = rawData.trim();
    if (fixed.endsWith(',')) fixed = fixed.slice(0, -1);
    if (!fixed.startsWith('[')) fixed = '[' + fixed + ']';
    products = JSON.parse(fixed);
  } catch (err) {
    console.error("Format non standard, lecture ligne par ligne...");
    const lines = rawData.split('\n');
    for (let line of lines) {
      if (!line.trim()) continue;
      if (line.endsWith(',')) line = line.slice(0, -1);
      try {
        products.push(JSON.parse(line));
      } catch (ex) {}
    }
  }
}

console.log(`Trouvé ${products.length} produits originaux.`);

const REVIEWS = [
  "Vraiment top, je recommande vivement !", "Conforme à la description, livraison rapide.",
  "Excellent rapport qualité-prix, très satisfait.", "Produit de bonne qualité, je suis impressionné.",
  "Parfait, ravi de l'achat.", "Très bonne qualité, solide et bien fini.",
  "Livraison rapide, produit conforme. Top vendeur !", "Fonctionnel et bien conçu.",
  "Super produit ! Tout est parfait.", "Article reçu en parfait état, merci !",
  "Un peu cher mais la qualité est là.", "Je ne m'attendais pas à ça, c'est génial."
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomReview = () => rand(REVIEWS);
const randomRating = () => Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
const sources = ["Cdiscount", "Rakuten", "eBay", "Fnac"];

// We want 5000 perfect objects, no duplicates.
// We'll shuffle the bestbuy products and take the first 5000 valid ones.
products = products.sort(() => 0.5 - Math.random());

const db = [];
const seenNames = new Set();

for (const item of products) {
  if (db.length >= 5000) break;
  if (!item.name || !item.price || !item.image) continue;
  
  // Clean up English specific terms to make it look more universal/French
  let name = item.name.replace(" - Mac|Windows", "").replace(" - Mac", "").replace(" - Windows", "");
  name = name.replace("Black", "Noir").replace("White", "Blanc").replace("Silver", "Argent");
  
  const key = name.toLowerCase().slice(0, 30);
  if (seenNames.has(key)) continue;
  seenNames.add(key);

  db.push({
    productName: name,
    price: item.price,
    images: [item.image],
    source: rand(sources),
    reviewText: randomReview(),
    realRating: randomRating()
  });
}

fs.writeFileSync('server/db_50k.json', JSON.stringify(db, null, 2));
console.log(`Sauvegardé ${db.length} vrais produits parfaits dans server/db_50k.json !`);
