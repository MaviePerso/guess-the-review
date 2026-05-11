const fs = require('fs');

const categories = [
  { kw: "laptop", name: "Ordinateur Portable", priceBase: 500, priceRange: 1500 },
  { kw: "smartphone", name: "Smartphone", priceBase: 200, priceRange: 800 },
  { kw: "guitar", name: "Guitare Électrique", priceBase: 150, priceRange: 1000 },
  { kw: "headphones", name: "Casque Bluetooth", priceBase: 50, priceRange: 300 },
  { kw: "watch", name: "Montre Connectée", priceBase: 100, priceRange: 400 },
  { kw: "camera", name: "Appareil Photo", priceBase: 300, priceRange: 1200 },
  { kw: "bicycle", name: "Vélo", priceBase: 200, priceRange: 800 },
  { kw: "drone", name: "Drone", priceBase: 100, priceRange: 900 },
  { kw: "sneakers", name: "Baskets", priceBase: 50, priceRange: 150 },
  { kw: "backpack", name: "Sac à Dos", priceBase: 30, priceRange: 100 },
  { kw: "chair", name: "Chaise de Bureau", priceBase: 80, priceRange: 300 },
  { kw: "lamp", name: "Lampe Design", priceBase: 20, priceRange: 100 },
  { kw: "keyboard", name: "Clavier Mécanique", priceBase: 50, priceRange: 150 },
  { kw: "mouse", name: "Souris Gamer", priceBase: 30, priceRange: 100 },
  { kw: "monitor", name: "Écran PC", priceBase: 100, priceRange: 400 },
  { kw: "perfume", name: "Parfum", priceBase: 50, priceRange: 100 },
  { kw: "sunglasses", name: "Lunettes de Soleil", priceBase: 40, priceRange: 200 },
  { kw: "wallet", name: "Portefeuille en Cuir", priceBase: 30, priceRange: 100 },
  { kw: "tent", name: "Tente de Camping", priceBase: 50, priceRange: 200 },
  { kw: "skateboard", name: "Skateboard", priceBase: 40, priceRange: 150 },
  { kw: "surfboard", name: "Planche de Surf", priceBase: 200, priceRange: 600 },
  { kw: "helmet", name: "Casque", priceBase: 100, priceRange: 400 },
  { kw: "telescope", name: "Télescope", priceBase: 150, priceRange: 500 },
  { kw: "microscope", name: "Microscope", priceBase: 80, priceRange: 300 },
  { kw: "pillow", name: "Coussin Ergonomique", priceBase: 20, priceRange: 80 },
  { kw: "sofa", name: "Canapé", priceBase: 300, priceRange: 1000 },
  { kw: "bed", name: "Lit Double", priceBase: 200, priceRange: 800 },
  { kw: "plant", name: "Plante d'Intérieur", priceBase: 15, priceRange: 100 },
  { kw: "vase", name: "Vase Céramique", priceBase: 20, priceRange: 100 },
  { kw: "mug", name: "Tasse Design", priceBase: 10, priceRange: 30 },
  { kw: "plate", name: "Assiette", priceBase: 5, priceRange: 25 },
  { kw: "knife", name: "Couteau de Chef", priceBase: 30, priceRange: 150 },
  { kw: "pan", name: "Poêle anti-adhésive", priceBase: 25, priceRange: 80 },
  { kw: "blender", name: "Blender", priceBase: 40, priceRange: 150 },
  { kw: "toaster", name: "Grille-pain", priceBase: 30, priceRange: 100 },
  { kw: "microwave", name: "Micro-ondes", priceBase: 80, priceRange: 250 },
  { kw: "fridge", name: "Réfrigérateur", priceBase: 300, priceRange: 1500 },
  { kw: "washer", name: "Lave-linge", priceBase: 250, priceRange: 800 },
  { kw: "vacuum", name: "Aspirateur", priceBase: 100, priceRange: 600 },
  { kw: "fan", name: "Ventilateur", priceBase: 30, priceRange: 150 },
  { kw: "heater", name: "Chauffage", priceBase: 50, priceRange: 200 },
  { kw: "iron", name: "Fer à repasser", priceBase: 30, priceRange: 120 },
  { kw: "towel", name: "Serviette", priceBase: 10, priceRange: 40 },
  { kw: "soap", name: "Savon Artisanal", priceBase: 5, priceRange: 20 },
  { kw: "shampoo", name: "Shampooing", priceBase: 8, priceRange: 30 },
  { kw: "lipstick", name: "Rouge à Lèvres", priceBase: 15, priceRange: 50 },
  { kw: "mascara", name: "Mascara", priceBase: 10, priceRange: 40 },
  { kw: "ring", name: "Bague", priceBase: 50, priceRange: 500 },
  { kw: "necklace", name: "Collier", priceBase: 60, priceRange: 600 },
  { kw: "earrings", name: "Boucles d'oreilles", priceBase: 40, priceRange: 400 }
];

const brands = ["Pro", "Elite", "Ultra", "Max", "Plus", "V2", "X", "One", "Series", "Classic", "Premium", "Smart", "Eco"];
const colors = ["Noir", "Blanc", "Bleu", "Rouge", "Argent", "Or", "Gris", "Vert", "Jaune", "Rose"];
const sources = ["eBay", "Cdiscount", "Rakuten", "Fnac", "Darty"];

const REVIEWS = [
  "Vraiment top, je recommande vivement !", "Conforme à la description, livraison rapide.",
  "Excellent rapport qualité-prix, très satisfait.", "Produit de bonne qualité, je suis impressionné.",
  "Parfait, ravi de l'achat.", "Très bonne qualité, solide et bien fini.",
  "Livraison rapide, produit conforme. Top vendeur !", "Fonctionnel et bien conçu.",
  "Super produit ! Tout est parfait.", "Article reçu en parfait état, merci !"
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomReview = () => rand(REVIEWS);
const randomRating = () => Math.round((3.5 + Math.random() * 1.5) * 10) / 10;

let db = [];

console.log("Generating Mega Database with LoremFlickr...");

for (const cat of categories) {
  // Generate 100 items per category
  for (let i = 1; i <= 100; i++) {
    const brand = rand(brands);
    const color = rand(colors);
    const price = cat.priceBase + Math.floor(Math.random() * cat.priceRange);
    
    db.push({
      productName: `${cat.name} ${brand} - ${color}`,
      price: price,
      // Use lock=i so each of the 100 items gets a unique but consistent image for that category
      images: [`https://loremflickr.com/500/500/${cat.kw}?lock=${i}`],
      source: rand(sources),
      reviewText: randomReview(),
      realRating: randomRating()
    });
  }
}

// Shuffle the DB
db = db.sort(() => 0.5 - Math.random());

fs.writeFileSync('db_massive.json', JSON.stringify(db, null, 2));
console.log(`Successfully generated ${db.length} unique products!`);
