const fs = require('fs');

async function buildMassiveDB() {
  let db = [];
  console.log("Building Ultimate DB...");

  // 1. Platzi Fake Store (200 items)
  try {
    const platziRes = await fetch('https://api.escuelajs.co/api/v1/products');
    const platziData = await platziRes.json();
    for (const item of platziData) {
      let images = item.images;
      if (typeof images[0] === 'string' && images[0].startsWith('[')) {
        try { images = JSON.parse(images[0]); } catch(e){}
      }
      db.push({
        productName: item.title,
        price: item.price,
        images: images,
        source: "Cdiscount",
        reviewText: "Plutôt satisfait, correspond à la description.",
        realRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10
      });
    }
    console.log("Added Platzi:", platziData.length);
  } catch(e) { console.error("Platzi error"); }

  // 2. DummyJSON (194 items)
  try {
    const dummyRes = await fetch('https://dummyjson.com/products?limit=200');
    const dummyData = await dummyRes.json();
    for (const item of dummyData.products) {
      db.push({
        productName: item.title,
        price: item.price,
        images: item.images,
        source: "Rakuten",
        reviewText: item.reviews && item.reviews.length > 0 ? item.reviews[0].comment : "Très bien.",
        realRating: item.rating
      });
    }
    console.log("Added DummyJSON:", dummyData.products.length);
  } catch(e) { console.error("Dummy error"); }

  // 3. FakeStoreAPI (20 items)
  try {
    const fakeRes = await fetch('https://fakestoreapi.com/products');
    const fakeData = await fakeRes.json();
    for (const item of fakeData) {
      db.push({
        productName: item.title,
        price: item.price,
        images: [item.image],
        source: "eBay",
        reviewText: "Qualité correcte pour le prix.",
        realRating: item.rating.rate
      });
    }
    console.log("Added FakeStore:", fakeData.length);
  } catch(e) { console.error("FakeStore error"); }

  // 4. Pokemon Plushies (151 items)
  try {
    const pokeRes = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
    const pokeData = await pokeRes.json();
    for (const item of pokeData.results) {
      const id = item.url.split('/')[6];
      db.push({
        productName: `Peluche Pokémon - ${item.name.charAt(0).toUpperCase() + item.name.slice(1)} (Officiel)`,
        price: Math.floor(Math.random() * 30) + 15, // 15 to 44
        images: [`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`],
        source: "Fnac",
        reviewText: "Super douce ! Mon fils adore.",
        realRating: Math.round((4.0 + Math.random() * 1.0) * 10) / 10
      });
    }
    console.log("Added Pokemon:", pokeData.results.length);
  } catch(e) { console.error("Poke error"); }

  // 5. Amiibo Figures
  try {
    const amiiboRes = await fetch('https://www.amiiboapi.com/api/amiibo/');
    const amiiboData = await amiiboRes.json();
    // take random 200
    const amiibos = amiiboData.amiibo.sort(() => 0.5 - Math.random()).slice(0, 200);
    for (const item of amiibos) {
      db.push({
        productName: `Figurine Amiibo - ${item.character} (${item.gameSeries})`,
        price: Math.floor(Math.random() * 40) + 12,
        images: [item.image],
        source: "Darty",
        reviewText: "Belle figurine de collection.",
        realRating: Math.round((4.2 + Math.random() * 0.8) * 10) / 10
      });
    }
    console.log("Added Amiibos:", amiibos.length);
  } catch(e) { console.error("Amiibo error"); }
  
  // 6. Rick and Morty Figures
  try {
    const rmRes = await fetch('https://rickandmortyapi.com/api/character');
    const rmData = await rmRes.json();
    for (const item of rmData.results) {
      db.push({
        productName: `Figurine Collection - ${item.name}`,
        price: Math.floor(Math.random() * 60) + 20,
        images: [item.image],
        source: "eBay",
        reviewText: "Détails impressionnants !",
        realRating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10
      });
    }
    console.log("Added Rick and Morty:", rmData.results.length);
  } catch(e) { console.error("RM error"); }

  // Clean and deduplicate
  const seen = new Set();
  const final = db.filter(item => {
    if (!item.productName || !item.images || item.images.length === 0 || !item.price) return false;
    const key = item.productName.slice(0, 30).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    // Cleanup invalid image URLs from platzi
    if (typeof item.images[0] !== 'string' || !item.images[0].startsWith('http')) return false;
    return true;
  });

  fs.writeFileSync('db_massive.json', JSON.stringify(final, null, 2));
  console.log(`Finished! Total unique items: ${final.length}`);
}

buildMassiveDB();
