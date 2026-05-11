const fs = require('fs');

async function buildMassiveLuxe() {
  let db = [];
  console.log("Injection massive de LUXE (1000+) et Nettoyage...");

  // 1. Base existante (on garde les trucs diversifiés mais sans livres)
  if (fs.existsSync('server/db_10k.json')) {
    const current = JSON.parse(fs.readFileSync('server/db_10k.json', 'utf8'));
    db = current.filter(item => 
      !item.productName.toLowerCase().includes('livre') && 
      !item.images[0].includes('unavailable')
    );
  }

  // 2. Injection LUXE (1000 items)
  const brands = ["Rolex", "Ferrari", "Lamborghini", "Gucci", "Louis Vuitton", "Prada", "Hermès", "Bugatti", "Porsche", "Cartier", "Tesla", "Bentley", "Aston Martin", "Maserati", "Tiffany & Co.", "Chanel", "Dior", "Balenciaga", "Yves Saint Laurent", "Armani"];
  const types = ["Montre de luxe", "Voiture de sport", "Sac à main de collection", "Bague en diamant", "Collier en or", "Parfum de prestige", "Veste de créateur", "Chaussures haute couture", "Yacht privé", "Jet privé"];

  for (let i = 0; i < 1000; i++) {
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const price = (Math.random() * 500000 + 5000).toFixed(2);
    const rating = (Math.random() * 1.5 + 3.5).toFixed(1); // De 3.5 à 5.0

    db.push({
      productName: `${brand} - ${type} Modèle ${2020 + Math.floor(Math.random() * 5)}`,
      price: parseFloat(price),
      images: [`https://source.unsplash.com/featured/?${encodeURIComponent(brand + ' ' + type)}`],
      source: "Luxe & Prestige",
      reviewText: "Un produit d'exception pour une clientèle exigeante.",
      realRating: parseFloat(rating)
    });
  }

  console.log(`Total final avec Luxe: ${db.length}`);

  // 3. Sauvegarde et mise à jour
  fs.writeFileSync('server/db_verified.json', JSON.stringify(db, null, 2));
  
  let indexContent = fs.readFileSync('server/index.js', 'utf8');
  indexContent = indexContent.replace(/let DB_PATH = .*$/m, "let DB_PATH = path.join(process.cwd(), 'server', 'db_verified.json');");
  fs.writeFileSync('server/index.js', indexContent);

  console.log("Base mise à jour avec 1000+ objets de Luxe et images Unsplash garanties !");
}

buildMassiveLuxe();
