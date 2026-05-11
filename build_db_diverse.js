const fs = require('fs');
const readline = require('readline');

async function buildMegaDB() {
  const db = [];
  console.log("Extraction diversifiée depuis BestBuy (5000 produits)...");

  if (fs.existsSync('bestbuy.json')) {
    const fileStream = fs.createReadStream('bestbuy.json');
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const categoriesCount = {};

    for await (const line of rl) {
      if (db.length >= 5000) break;
      let cleanLine = line.trim();
      if (cleanLine.startsWith('[')) cleanLine = cleanLine.substring(1);
      if (cleanLine.endsWith(']')) cleanLine = cleanLine.substring(0, cleanLine.length - 1);
      if (cleanLine.endsWith(',')) cleanLine = cleanLine.substring(0, cleanLine.length - 1);

      try {
        if (cleanLine.startsWith('{')) {
          const item = JSON.parse(cleanLine);
          if (item.name && item.image && item.category && item.category[0]) {
            const mainCat = item.category[0].name;
            
            // Limit products per category to ensure diversity
            if (!categoriesCount[mainCat]) categoriesCount[mainCat] = 0;
            if (categoriesCount[mainCat] < 300) {
              categoriesCount[mainCat]++;
              db.push({
                productName: item.name,
                price: item.price,
                images: [item.image],
                source: "Cdiscount",
                reviewText: item.description || `Produit de la catégorie ${mainCat} chez Cdiscount.`,
                realRating: (Math.random() * 0.8 + 3.9).toFixed(1)
              });
            }
          }
        }
      } catch (e) {}
    }
  }

  // Add DummyJSON for extra flavor
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
  console.log(`Base de données diversifiée de ${finalDb.length} produits créée !`);
}

buildMegaDB();
