const fs = require('fs');
const axios = require('axios');

const sources = ["Cdiscount", "eBay", "Rakuten", "Fnac", "Darty", "Amazon"];
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function buildMegaDB() {
  let db = [];
  console.log("=== Construction de la base ULTIME (10 000 produits) ===");

  // Helper pour éviter les NaN et avoir des notes réalistes
  const ensureRating = (val) => {
    let r = parseFloat(val);
    if (isNaN(r) || r <= 0) return (Math.random() * 0.8 + 3.9).toFixed(1);
    return r.toFixed(1);
  };

  // 1. Tech (DummyJSON)
  try {
    const res = await axios.get('https://dummyjson.com/products?limit=200');
    res.data.products.forEach(item => {
      db.push({
        productName: item.title,
        price: item.price,
        images: item.images,
        source: rand(sources),
        reviewText: item.description,
        realRating: ensureRating(item.rating)
      });
    });
    console.log(`Tech OK: ${db.length}`);
  } catch(e) {}

  // 2. Films (TMDB)
  console.log("Récupération Films...");
  for (let page = 1; page <= 50; page++) {
    try {
      const res = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=15d2ea6d0dc1d836ee5e888417659e1c&language=fr-FR&page=${page}`);
      res.data.results.forEach(m => {
        if (m.poster_path) {
          db.push({
            productName: `DVD - ${m.title}`,
            price: (Math.random() * 10 + 9.99).toFixed(2),
            images: [`https://image.tmdb.org/t/p/w500${m.poster_path}`],
            source: rand(sources),
            reviewText: m.overview ? m.overview.substring(0, 150) + "..." : "Un grand classique.",
            realRating: ensureRating(m.vote_average / 2)
          });
        }
      });
      if (db.length > 1500) break;
    } catch(e) { break; }
  }
  console.log(`Total après Films: ${db.length}`);

  // 3. Jeux Vidéo (RAWG)
  console.log("Récupération Jeux...");
  for (let page = 1; page <= 40; page++) {
    try {
      const res = await axios.get(`https://api.rawg.io/api/games?key=74052044816c4f3484f93a9d20c32587&page_size=50&page=${page}`);
      res.data.results.forEach(g => {
        if (g.background_image) {
          db.push({
            productName: `Jeu Vidéo - ${g.name}`,
            price: (Math.random() * 40 + 19.99).toFixed(2),
            images: [g.background_image],
            source: rand(sources),
            reviewText: "Un gameplay exceptionnel et des graphismes au top.",
            realRating: ensureRating(g.rating)
          });
        }
      });
      if (db.length > 3000) break;
    } catch(e) { break; }
  }
  console.log(`Total après Jeux: ${db.length}`);

  // 4. iTunes (Apps & Media)
  console.log("Récupération iTunes...");
  const terms = ["apple", "google", "game", "pro", "music", "photo", "editor", "tool", "social", "life"];
  for (const term of terms) {
    try {
      const res = await axios.get(`https://itunes.apple.com/search?term=${term}&limit=200&entity=software`);
      res.data.results.forEach(item => {
        db.push({
          productName: `App Store - ${item.trackName}`,
          price: item.price > 0 ? item.price : (Math.random() * 5 + 0.99).toFixed(2),
          images: [item.artworkUrl512 || item.artworkUrl100],
          source: "Apple Store",
          reviewText: "Une application indispensable pour votre iPhone.",
          realRating: ensureRating(item.averageUserRating)
        });
      });
      if (db.length > 6000) break;
    } catch(e) {}
  }
  console.log(`Total après iTunes: ${db.length}`);

  // 5. OpenFoodFacts (Alimentaire)
  console.log("Récupération Alimentaire...");
  try {
    const res = await axios.get('https://fr.openfoodfacts.org/cgi/search.pl?action=process&sort_by=unique_scans_n&page_size=2000&json=true');
    res.data.products.forEach(item => {
      if (item.product_name && item.image_url) {
        db.push({
          productName: item.product_name,
          price: (Math.random() * 8 + 1.20).toFixed(2),
          images: [item.image_url],
          source: "Cdiscount",
          reviewText: "Produit de consommation courante très apprécié.",
          realRating: ensureRating(Math.random() * 1 + 3.8) // Simulated but safe
        });
      }
    });
  } catch(e) {}
  console.log(`Total après Alimentaire: ${db.length}`);

  // 6. Amiibo (Figurines)
  try {
    const res = await axios.get('https://www.amiiboapi.com/api/amiibo/');
    res.data.amiibo.forEach(item => {
      db.push({
        productName: `Figurine Amiibo ${item.character}`,
        price: (Math.random() * 15 + 12.99).toFixed(2),
        images: [item.image],
        source: rand(sources),
        reviewText: "Figurine de collection officielle.",
        realRating: ensureRating(Math.random() * 0.5 + 4.4)
      });
    });
  } catch(e) {}

  // Mix and slice to 10 000
  db = db.sort(() => Math.random() - 0.5);
  if (db.length > 10000) db = db.slice(0, 10000);

  // Sauvegarde finale
  fs.writeFileSync('server/db_10k.json', JSON.stringify(db, null, 2));
  console.log(`\nBase de données de ${db.length} produits créée avec succès ! (Zéro NaN)`);
}

buildMegaDB();
