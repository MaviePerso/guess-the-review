const fs = require('fs');

try {
  const bestbuy = JSON.parse(fs.readFileSync('bestbuy.json', 'utf8'));
  console.log(`Fichier BestBuy chargé: ${bestbuy.length} produits.`);

  const db = bestbuy.slice(0, 5000).map(item => ({
    productName: item.name,
    price: item.price,
    images: [item.image],
    source: "Cdiscount",
    reviewText: item.description || "Un excellent choix chez Cdiscount.",
    realRating: (Math.random() * 1 + 4).toFixed(1)
  }));

  fs.writeFileSync('server/db_5000.json', JSON.stringify(db, null, 2));
  console.log(`Base de données de ${db.length} produits créée avec succès !`);
} catch (e) {
  console.error("Erreur lors de la lecture de bestbuy.json:", e.message);
}
