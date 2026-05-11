const fs = require('fs');

try {
  let db = JSON.parse(fs.readFileSync('server/db_10k.json', 'utf8'));
  console.log(`Base de ${db.length} produits chargée.`);

  let fixCount = 0;
  db.forEach(item => {
    if (item.images) {
      item.images = item.images.map(img => {
        if (img.startsWith('http://')) {
          fixCount++;
          return img.replace('http://', 'https://');
        }
        return img;
      });
    }
  });

  fs.writeFileSync('server/db_10k.json', JSON.stringify(db, null, 2));
  console.log(`Terminé ! ${fixCount} URLs d'images ont été corrigées en HTTPS.`);
} catch (e) {
  console.error("Erreur:", e.message);
}
