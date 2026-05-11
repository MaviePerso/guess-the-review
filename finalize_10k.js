const fs = require('fs');
const readline = require('readline');

async function buildMegaDB() {
  const db = [];
  console.log("Fusion massive (10 000 produits) + Correction des NaN...");

  // 1. Tech & Divers (BestBuy) - 4000 items
  if (fs.existsSync('bestbuy.json')) {
    const fileStream = fs.createReadStream('bestbuy.json');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (db.length >= 4000) break;
      let cl = line.trim();
      if (cl.startsWith('[')) cl = cl.substring(1);
      if (cl.endsWith(']')) cl = cl.substring(0, cl.length - 1);
      if (cl.endsWith(',')) cl = cl.substring(0, cl.length - 1);
      try {
        if (cl.startsWith('{')) {
          const item = JSON.parse(cl);
          if (item.name && item.image) {
            db.push({
              productName: item.name,
              price: item.price,
              images: [item.image],
              source: "Cdiscount",
              reviewText: item.description || "Un excellent produit high-tech.",
              realRating: (Math.random() * 0.9 + 3.9).toFixed(1)
            });
          }
        }
      } catch (e) {}
    }
  }
  console.log(`BestBuy chargés: ${db.length}`);

  // 2. Livres (Goodreads CSV) - 4000 items
  if (fs.existsSync('books.csv')) {
    const content = fs.readFileSync('books.csv', 'utf8');
    const lines = content.split('\n').slice(1);
    for (let i = 0; i < lines.length; i++) {
      if (db.length >= 8000) break;
      const parts = lines[i].split(',');
      if (parts.length > 12) {
        const rating = parseFloat(parts[12]);
        const imageUrl = parts[parts.length - 2];
        const title = parts[10];
        if (title && imageUrl && !isNaN(rating)) {
          db.push({
            productName: `Livre - ${title.replace(/"/g, '')}`,
            price: (Math.random() * 15 + 6.99).toFixed(2),
            images: [imageUrl.trim()],
            source: "Cdiscount",
            reviewText: "Un livre incontournable chez Cdiscount.",
            realRating: rating.toFixed(1)
          });
        }
      }
    }
  }
  console.log(`Total avec Livres: ${db.length}`);

  // 3. Funny & Random (Procedural) - 2000 items
  if (fs.existsSync('server/db_50k.json')) {
    const backup = JSON.parse(fs.readFileSync('server/db_50k.json', 'utf8'));
    for (let i = 0; i < backup.length; i++) {
      if (db.length >= 10000) break;
      const item = backup[i];
      db.push({
        productName: item.productName,
        price: item.price,
        images: item.images || [item.imageUrl],
        source: "Cdiscount",
        reviewText: item.reviewText || "Produit insolite et amusant !",
        realRating: (Math.random() * 1.5 + 3.3).toFixed(1)
      });
    }
  }
  console.log(`Total final: ${db.length}`);

  // Shuffle and Save
  const finalDb = db.sort(() => Math.random() - 0.5);
  fs.writeFileSync('server/db_10k.json', JSON.stringify(finalDb, null, 2));
  
  // Update path in index.js to use db_10k.json
  const indexFile = path.join(process.cwd(), 'server', 'index.js');
  let indexContent = fs.readFileSync('server/index.js', 'utf8');
  indexContent = indexContent.replace(/let DB_PATH = .*$/m, "let DB_PATH = path.join(process.cwd(), 'server', 'db_10k.json');");
  fs.writeFileSync('server/index.js', indexContent);

  console.log("Base de 10 000 produits et index.js mis à jour !");
}

const path = require('path');
buildMegaDB();
