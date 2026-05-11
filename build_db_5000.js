const fs = require('fs');
const readline = require('readline');

async function buildMegaDB() {
  const db = [];
  console.log("Démarrage de la construction de la base de 5000 produits (via BestBuy + Dummy)...");

  // 1. Read BestBuy line by line
  if (fs.existsSync('bestbuy.json')) {
    const fileStream = fs.createReadStream('bestbuy.json');
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (db.length >= 5000) break;
      let cleanLine = line.trim();
      if (cleanLine.startsWith('[')) cleanLine = cleanLine.substring(1);
      if (cleanLine.endsWith(']')) cleanLine = cleanLine.substring(0, cleanLine.length - 1);
      if (cleanLine.endsWith(',')) cleanLine = cleanLine.substring(0, cleanLine.length - 1);

      try {
        if (cleanLine.startsWith('{')) {
          const item = JSON.parse(cleanLine);
          if (item.name && item.image) {
            db.push({
              productName: item.name,
              price: item.price,
              images: [item.image],
              source: "Cdiscount",
              reviewText: item.description || "Produit certifié Cdiscount.",
              realRating: (Math.random() * 1 + 4).toFixed(1)
            });
          }
        }
      } catch (e) {
        // Ignore parsing errors for corrupted lines
      }
    }
  }

  // 2. Add DummyJSON items
  try {
    const res = await fetch('https://dummyjson.com/products?limit=200');
    const data = await res.json();
    data.products.forEach(item => {
      db.push({
        productName: item.title,
        price: item.price,
        images: item.images,
        source: "Cdiscount",
        reviewText: item.description,
        realRating: item.rating
      });
    });
  } catch(e) {}

  console.log(`Total récolté: ${db.length}`);
  const finalDb = db.sort(() => Math.random() - 0.5).slice(0, 5000);

  fs.writeFileSync('server/db_5000.json', JSON.stringify(finalDb, null, 2));
  console.log(`Base de données de ${finalDb.length} produits créée avec succès !`);
}

buildMegaDB();
