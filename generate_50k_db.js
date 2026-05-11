const fs = require('fs');

const categories = [
  // --- TECH & ELECTRONICS ---
  { kw: "smartphone", name: "Smartphone", priceBase: 200, priceRange: 1000 },
  { kw: "laptop", name: "PC Portable", priceBase: 400, priceRange: 1500 },
  { kw: "gaming,pc", name: "PC Gamer Tour", priceBase: 800, priceRange: 2000 },
  { kw: "headphones", name: "Casque Audio", priceBase: 30, priceRange: 250 },
  { kw: "earbuds", name: "Écouteurs Sans Fil", priceBase: 20, priceRange: 150 },
  { kw: "smartwatch", name: "Montre Connectée", priceBase: 50, priceRange: 400 },
  { kw: "television", name: "TV 4K UHD", priceBase: 300, priceRange: 1200 },
  { kw: "drone", name: "Drone Caméra", priceBase: 100, priceRange: 800 },
  { kw: "camera", name: "Appareil Photo Reflex", priceBase: 400, priceRange: 1500 },
  { kw: "speaker", name: "Enceinte Bluetooth", priceBase: 30, priceRange: 200 },
  { kw: "keyboard", name: "Clavier Mécanique", priceBase: 40, priceRange: 150 },
  { kw: "mouse", name: "Souris Gamer", priceBase: 20, priceRange: 100 },
  { kw: "monitor", name: "Écran PC 144Hz", priceBase: 150, priceRange: 500 },
  { kw: "tablet", name: "Tablette Tactile", priceBase: 150, priceRange: 800 },
  { kw: "router", name: "Routeur WiFi 6", priceBase: 50, priceRange: 200 },
  // --- HOME & FURNITURE ---
  { kw: "sofa", name: "Canapé d'angle", priceBase: 300, priceRange: 1200 },
  { kw: "bed", name: "Lit King Size", priceBase: 250, priceRange: 800 },
  { kw: "chair", name: "Chaise Ergonomique", priceBase: 80, priceRange: 300 },
  { kw: "desk", name: "Bureau en bois", priceBase: 100, priceRange: 400 },
  { kw: "lamp", name: "Lampe de salon", priceBase: 20, priceRange: 100 },
  { kw: "rug", name: "Tapis moderne", priceBase: 40, priceRange: 200 },
  { kw: "wardrobe", name: "Armoire penderie", priceBase: 150, priceRange: 500 },
  { kw: "mirror", name: "Miroir mural", priceBase: 30, priceRange: 150 },
  { kw: "pillow", name: "Oreiller Mémoire de Forme", priceBase: 20, priceRange: 60 },
  { kw: "blanket", name: "Plaid Polaire", priceBase: 15, priceRange: 40 },
  { kw: "vacuum", name: "Aspirateur Balai", priceBase: 100, priceRange: 400 },
  { kw: "blender", name: "Blender Chauffant", priceBase: 50, priceRange: 150 },
  { kw: "coffeemaker", name: "Machine à Expresso", priceBase: 80, priceRange: 400 },
  { kw: "microwave", name: "Micro-ondes", priceBase: 60, priceRange: 150 },
  { kw: "fridge", name: "Réfrigérateur Américain", priceBase: 500, priceRange: 1500 },
  // --- SPORTS & OUTDOORS ---
  { kw: "bicycle", name: "Vélo Tout Terrain", priceBase: 150, priceRange: 800 },
  { kw: "scooter", name: "Trottinette Électrique", priceBase: 200, priceRange: 600 },
  { kw: "skateboard", name: "Skateboard", priceBase: 40, priceRange: 120 },
  { kw: "surfboard", name: "Planche de Surf", priceBase: 200, priceRange: 600 },
  { kw: "snowboard", name: "Snowboard", priceBase: 150, priceRange: 500 },
  { kw: "tent", name: "Tente 4 Personnes", priceBase: 80, priceRange: 250 },
  { kw: "sleepingbag", name: "Sac de Couchage", priceBase: 30, priceRange: 100 },
  { kw: "backpack", name: "Sac de Randonnée", priceBase: 50, priceRange: 150 },
  { kw: "dumbbell", name: "Haltères Musculation", priceBase: 20, priceRange: 80 },
  { kw: "treadmill", name: "Tapis de Course", priceBase: 300, priceRange: 1000 },
  // --- FASHION & ACCESSORIES ---
  { kw: "sneakers", name: "Baskets Sneakers", priceBase: 50, priceRange: 200 },
  { kw: "boots", name: "Bottes en Cuir", priceBase: 80, priceRange: 250 },
  { kw: "jacket", name: "Veste d'Hiver", priceBase: 60, priceRange: 200 },
  { kw: "tshirt", name: "T-Shirt Coton", priceBase: 15, priceRange: 40 },
  { kw: "jeans", name: "Pantalon Jeans", priceBase: 30, priceRange: 100 },
  { kw: "sunglasses", name: "Lunettes de Soleil", priceBase: 20, priceRange: 150 },
  { kw: "wallet", name: "Portefeuille", priceBase: 20, priceRange: 80 },
  { kw: "watch", name: "Montre Analogique", priceBase: 50, priceRange: 500 },
  { kw: "ring", name: "Bague en Argent", priceBase: 30, priceRange: 200 },
  { kw: "necklace", name: "Collier Pendentif", priceBase: 40, priceRange: 300 },
  // --- MUSIC & HOBBIES ---
  { kw: "guitar", name: "Guitare Acoustique", priceBase: 100, priceRange: 500 },
  { kw: "piano", name: "Clavier Maître", priceBase: 80, priceRange: 400 },
  { kw: "drumset", name: "Batterie Électronique", priceBase: 200, priceRange: 800 },
  { kw: "telescope", name: "Télescope Astronomique", priceBase: 100, priceRange: 500 },
  { kw: "microscope", name: "Microscope Pro", priceBase: 80, priceRange: 300 },
  { kw: "boardgame", name: "Jeu de Société Stratégie", priceBase: 25, priceRange: 60 },
  { kw: "puzzle", name: "Puzzle 2000 Pièces", priceBase: 15, priceRange: 35 },
  { kw: "lego", name: "Set de Construction Briques", priceBase: 30, priceRange: 200 },
  { kw: "actionfigure", name: "Figurine de Collection", priceBase: 20, priceRange: 100 },
  { kw: "comicbook", name: "Comics Édition Limitée", priceBase: 15, priceRange: 50 },
  // --- FUNNY, WEIRD & RANDOM (LES TRUCS DRÔLES !) ---
  { kw: "trex,costume", name: "Costume T-Rex Gonflable Géant", priceBase: 40, priceRange: 40 },
  { kw: "dog,wig", name: "Perruque Blonde pour Chien", priceBase: 10, priceRange: 20 },
  { kw: "toilet,mug", name: "Mug en forme de Toilette", priceBase: 15, priceRange: 10 },
  { kw: "chicken,pillow", name: "Coussin Cuisse de Poulet Frit", priceBase: 25, priceRange: 15 },
  { kw: "sandals,socks", name: "Chaussettes Motif Sandales", priceBase: 8, priceRange: 10 },
  { kw: "banana,umbrella", name: "Parapluie Banane Jaune", priceBase: 18, priceRange: 12 },
  { kw: "pigeon,mask", name: "Masque de Pigeon Réaliste", priceBase: 22, priceRange: 15 },
  { kw: "ugly,sweater", name: "Pull de Noël Horriblement Moche", priceBase: 30, priceRange: 25 },
  { kw: "zombie,gnome", name: "Nain de Jardin Zombie Sanglant", priceBase: 35, priceRange: 20 },
  { kw: "flamingo,float", name: "Bouée Flamant Rose Géant", priceBase: 25, priceRange: 20 },
  { kw: "shark,catbed", name: "Panier pour Chat Mâchoire de Requin", priceBase: 28, priceRange: 15 },
  { kw: "propeller,hat", name: "Casquette à Hélice Multicolore", priceBase: 12, priceRange: 8 },
  { kw: "burrito,blanket", name: "Plaid Tortilla Burrito Géant", priceBase: 25, priceRange: 15 },
  { kw: "screaming,chicken", name: "Poulet Hurlant en Caoutchouc", priceBase: 5, priceRange: 5 },
  { kw: "golf,toilet", name: "Mini Golf de Toilettes", priceBase: 18, priceRange: 10 },
  { kw: "fish,slippers", name: "Chaussons Poisson Vert", priceBase: 20, priceRange: 10 },
  { kw: "unicorn,onesie", name: "Pyjama Grenouillère Licorne", priceBase: 35, priceRange: 20 },
  { kw: "beard,beanie", name: "Bonnet avec Fausse Barbe Intégrée", priceBase: 15, priceRange: 10 },
  { kw: "Nicolas,Cage,pillow", name: "Housse de Coussin Nicolas Cage Magique", priceBase: 20, priceRange: 10 },
  { kw: "cat,backpack", name: "Sac à Dos Astronaute pour Chat", priceBase: 45, priceRange: 20 },
  { kw: "dinosaur,taco", name: "Support à Tacos Dinosaure", priceBase: 12, priceRange: 8 },
  { kw: "finger,hands", name: "Mini Mains pour Doigts", priceBase: 6, priceRange: 5 },
  { kw: "yodeling,pickle", name: "Cornichon Chanteur Yodel", priceBase: 15, priceRange: 5 },
  { kw: "bacon,soap", name: "Savon au parfum de Bacon", priceBase: 8, priceRange: 5 },
  { kw: "pizza,socks", name: "Chaussettes Boîte à Pizza", priceBase: 14, priceRange: 8 },
  { kw: "horse,mask", name: "Masque de Cheval Flippant", priceBase: 20, priceRange: 10 },
  { kw: "sloth,mug", name: "Mug Paresseux Accroché", priceBase: 16, priceRange: 8 },
  { kw: "corgi,butt", name: "Coussin Fesses de Corgi", priceBase: 22, priceRange: 12 },
  { kw: "fake,belly", name: "Sac Banane Faux Ventre à Bière", priceBase: 18, priceRange: 10 },
  { kw: "keyboard,waffle", name: "Moule à Gaufres Clavier", priceBase: 30, priceRange: 15 },
  { kw: "lobster,claws", name: "Gants Pinces de Homard", priceBase: 25, priceRange: 10 },
  { kw: "hotdog,costume", name: "Costume de Hot-Dog", priceBase: 35, priceRange: 15 },
  { kw: "alien,abduction", name: "Costume Enlèvement Extraterrestre", priceBase: 45, priceRange: 20 },
  { kw: "cat,dj", name: "Griffoir Platine DJ pour Chat", priceBase: 28, priceRange: 10 },
  { kw: "toilet,nightlight", name: "Lumière LED de Cuvette Toilettes", priceBase: 10, priceRange: 5 }
];

// 95 categories total.
// To get 50,000 items, we need 526 items per category.
// Let's do 550 items per category -> 95 * 550 = 52,250 items.

const brands = ["Pro", "Elite", "Ultra", "Max", "Plus", "V2", "X", "One", "Series", "Classic", "Premium", "Smart", "Eco", "Deluxe", "Edition", "Turbo", "Mini"];
const colors = ["Noir", "Blanc", "Bleu", "Rouge", "Argent", "Or", "Gris", "Vert", "Jaune", "Rose", "Violet", "Multicolore", "Transparent"];
const sources = ["eBay", "Cdiscount", "Rakuten", "Fnac", "Darty", "Amazon"];

const REVIEWS = [
  "Vraiment top, je recommande vivement !", "Conforme à la description, livraison rapide.",
  "Excellent rapport qualité-prix, très satisfait.", "Produit de bonne qualité, je suis impressionné.",
  "Parfait, ravi de l'achat.", "Très bonne qualité, solide et bien fini.",
  "Livraison rapide, produit conforme. Top vendeur !", "Fonctionnel et bien conçu.",
  "Super produit ! Tout est parfait.", "Article reçu en parfait état, merci !",
  "Un peu cher mais la qualité est là.", "Je ne m'attendais pas à ça, c'est génial.",
  "Moyen, fait le boulot mais sans plus.", "Très drôle, parfait pour un cadeau !",
  "Mon chat adore, je n'en reviens pas.", "Hilarant, j'ai fait pleurer de rire mes amis."
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomReview = () => rand(REVIEWS);
const randomRating = () => Math.round((3.0 + Math.random() * 2.0) * 10) / 10;

let db = [];

console.log("Generating 50k Mega Database with LoremFlickr...");

for (const cat of categories) {
  for (let i = 1; i <= 550; i++) {
    // Generate variations of the name
    const brand = rand(brands);
    const color = rand(colors);
    const price = cat.priceBase + Math.floor(Math.random() * cat.priceRange);
    
    // Some items get brands/colors, some funny ones don't need it but we add it randomly
    const useBrandColor = Math.random() > 0.3;
    let finalName = cat.name;
    if (useBrandColor) {
      finalName += ` ${brand} - ${color}`;
    } else {
      finalName += ` (Modèle ${i})`;
    }
    
    db.push({
      productName: finalName,
      price: price,
      // Use lock=i so each of the 550 items gets a unique but consistent image for that category
      images: [`https://loremflickr.com/500/500/${cat.kw}?lock=${i}`],
      source: rand(sources),
      reviewText: randomReview(),
      realRating: randomRating()
    });
  }
}

// Shuffle the massive DB
db = db.sort(() => 0.5 - Math.random());

fs.writeFileSync('db_50k.json', JSON.stringify(db, null, 2));
console.log(`Successfully generated ${db.length} unique products!`);
