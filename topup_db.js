const fs = require('fs');

const db = JSON.parse(fs.readFileSync('server/db_5000.json', 'utf8'));
console.log(`Base actuelle: ${db.length}`);

if (fs.existsSync('books.csv')) {
  const content = fs.readFileSync('books.csv', 'utf8');
  const lines = content.split('\n').slice(1);
  for (let i = 0; i < lines.length; i++) {
    if (db.length >= 5000) break;
    const parts = lines[i].split(',');
    if (parts.length > 12) {
      db.push({
        productName: `Livre - ${parts[10].replace(/"/g, '')}`,
        price: (Math.random() * 15 + 6.99).toFixed(2),
        images: [parts[parts.length - 2].trim()],
        source: "Cdiscount",
        reviewText: "Un best-seller mondial.",
        realRating: parseFloat(parts[12]).toFixed(1)
      });
    }
  }
}

fs.writeFileSync('server/db_5000.json', JSON.stringify(db, null, 2));
console.log(`Base finale: ${db.length}`);
