const fs = require('fs');
const readline = require('readline');

async function buildMegaDB() {
  const db = [];
  console.log("Reconstruction de la base (10 000 produits) SANS LIVRES...");

  // 1. Tech, Maison, Jouets, Musique (BestBuy) - 8000 items
  if (fs.existsSync('bestbuy.json')) {
    const fileStream = fs.createReadStream('bestbuy.json');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    
    const categoriesCount = {};

    for await (const line of rl) {
      if (db.length >= 8000) break;
      let cl = line.trim();
      if (cl.startsWith('[')) cl = cl.substring(1);
      if (cl.endsWith(']')) cl = cl.substring(0, cl.length - 1);
      if (cl.endsWith(',')) cl = cl.substring(0, cl.length - 1);
      try {
        if (cl.startsWith('{')) {
          const item = JSON.parse(cl);
          // Filtrer pour éviter les livres ou trucs ennuyeux si possible
          if (item.name && item.image && item.type !== 'Software') {
            const mainCat = (item.category && item.category[0]) ? item.category[0].name : "Divers";
            
            if (!categoriesCount[mainCat]) categoriesCount[mainCat] = 0;
            if (categoriesCount[mainCat] < 500) { // Max 500 par catégorie pour la diversité
              categoriesCount[mainCat]++;
              db.push({
                productName: item.name,
                price: item.price,
                images: [item.image],
                source: "Cdiscount",
                reviewText: item.description || "Un produit top chez Cdiscount.",
                realRating: (Math.random() * 0.9 + 3.9).toFixed(1)
              });
            }
          }
        }
      } catch (e) {}
    }
  }
  console.log(`BestBuy diversifiés: ${db.length}`);

  // 2. Funny & Random (Procedural) - 2000 items
  if (fs.existsSync('server/db_50k.json')) {
    const backup = JSON.parse(fs.readFileSync('server/db_50k.json', 'utf8'));
    for (let i = 0; i < backup.length; i++) {
      if (db.length >= 10000) break;
      const item = backup[i];
      // Éviter les livres dans la base procédurale aussi
      if (item.productName.toLowerCase().includes('livre') || item.productName.toLowerCase().includes('book')) continue;
      
      db.push({
        productName: item.productName,
        price: item.price,
        images: item.images || [item.imageUrl],
        source: "Cdiscount",
        reviewText: item.reviewText || "Objet insolite et drôle !",
        realRating: (Math.random() * 1.2 + 3.5).toFixed(1)
      });
    }
  }
  console.log(`Total final: ${db.length}`);

  // Shuffle and Save
  const finalDb = db.sort(() => Math.random() - 0.5);
  fs.writeFileSync('server/db_10k.json', JSON.stringify(finalDb, null, 2));
  console.log("Base de 10 000 produits (Zéro livres) créée !");
}

buildMegaDB();
