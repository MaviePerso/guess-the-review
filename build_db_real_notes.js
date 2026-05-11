const fs = require('fs');

async function buildMegaDB() {
  let db = [];
  console.log("Démarrage de la construction de la base de 5000 produits avec VRAIES NOTES...");

  // 1. Tech products from DummyJSON (194)
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
    console.log("Tech ajoutés:", db.length);
  } catch(e) { console.log("Erreur Tech"); }

  // 2. Books from Goodreads CSV (4800)
  try {
    const content = fs.readFileSync('books.csv', 'utf8');
    const lines = content.split('\n');
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      if (db.length >= 5000) break;
      const line = lines[i];
      if (!line) continue;
      
      // Basic CSV split (caution with quotes)
      const parts = line.split(',');
      if (parts.length > 12) {
        // Find title and image url by looking at the header indices
        // image_url is usually parts[21], average_rating is parts[12], title is parts[10]
        // But since titles can contain commas, we have to be careful.
        // Let's use a regex or just take the last few parts.
        const rating = parseFloat(parts[12]);
        const imageUrl = parts[parts.length - 2];
        const title = parts[10];

        if (title && imageUrl && !isNaN(rating)) {
          db.push({
            productName: `Livre - ${title.replace(/"/g, '')}`,
            price: (Math.random() * 15 + 6.99).toFixed(2),
            images: [imageUrl.trim()],
            source: "Cdiscount",
            reviewText: "Un best-seller mondial disponible chez Cdiscount.",
            realRating: rating
          });
        }
      }
    }
    console.log("Total final:", db.length);
  } catch(e) { console.log("Erreur Livres:", e.message); }

  db = db.sort(() => Math.random() - 0.5);
  fs.writeFileSync('server/db_5000.json', JSON.stringify(db, null, 2));
  console.log(`Base de données de ${db.length} produits créée avec succès !`);
}

buildMegaDB();
