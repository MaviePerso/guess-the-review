const fs = require('fs');
const http = require('http');
const https = require('https');

const db = JSON.parse(fs.readFileSync('server/db_verified.json', 'utf8'));
console.log(`Avant: ${db.length}`);

const luxuryKeywords = [
  'rolex', 'ferrari', 'lamborghini', 'porsche', 'bugatti', 'bentley', 'rolls-royce', 'rolls royce',
  'gucci', 'hermes', 'hermès', 'chanel', 'louis vuitton', 'prada', 'patek', 'audemars', 'cartier',
  'diamond', 'luxury', 'penthouse', 'mansion', 'yacht', 'prestige', 'platinum edition', 'rare edition',
  'luxe officiel', 'jamesedition', 'chrono24', 'vestiaire', 'hublot', 'tag heuer', 'breitling',
  'mclaren', 'aston martin', 'maserati', 'dior', 'balenciaga', 'versace', 'givenchy'
];

let cleaned = db.filter(item => {
  const name = (item.productName || '').toLowerCase();
  const src = (item.source || '').toLowerCase();
  const desc = (item.reviewText || '').toLowerCase();
  const hasLuxuryKeyword = luxuryKeywords.some(kw => name.includes(kw) || src.includes(kw) || desc.includes(kw));
  const isTooExpensive = item.price > 8000;
  return !hasLuxuryKeyword && !isTooExpensive;
});

console.log(`Apres Purge Luxe: ${cleaned.length} (Supprimes: ${db.length - cleaned.length})`);

const CONCURRENCY = 40;
const TIMEOUT_MS = 5000;

function checkImage(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, { method: 'HEAD', timeout: TIMEOUT_MS }, (res) => {
      const size = parseInt(res.headers['content-length'] || '0', 10);
      const type = res.headers['content-type'] || '';
      
      const isTooSmall = size > 0 && size < 2000;
      const isKnownPlaceholder = size === 14867 || size === 3495 || size === 11462;
      const isNotImage = type && !type.includes('image');
      const isError = res.statusCode >= 400;
      const isRedirectToPlaceholder = res.headers.location && res.headers.location.includes('notfound');

      resolve({ ok: !isTooSmall && !isKnownPlaceholder && !isNotImage && !isError && !isRedirectToPlaceholder, url });
    });
    req.on('error', () => resolve({ ok: false, url }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, url }); });
    req.end();
  });
}

async function runBatch(items) {
  return Promise.all(items.map(item => checkImage(item.images[0]).then(r => ({ ...r, item }))));
}

async function main() {
  const finalGoodItems = [];
  let deadCount = 0;
  let checkedCount = 0;

  console.log('Demarrage de la verification HTTP approfondie...');
  
  for (let i = 0; i < cleaned.length; i += CONCURRENCY) {
    const batch = cleaned.slice(i, i + CONCURRENCY);
    const results = await runBatch(batch);
    
    for (const r of results) {
      if (r.ok) {
        finalGoodItems.push(r.item);
      } else {
        deadCount++;
      }
    }
    
    checkedCount += batch.length;
    process.stdout.write(`\rVerifie: ${checkedCount}/${cleaned.length} | Morts: ${deadCount} | Valides: ${finalGoodItems.length}   `);
  }

  console.log(`\nVerification terminee. ${deadCount} images mortes supprimees.`);
  
  fs.writeFileSync('server/db_verified.json', JSON.stringify(finalGoodItems, null, 2));
  
  const shuffledSolo = [...finalGoodItems].sort(() => Math.random() - 0.5).slice(0, 600);
  fs.writeFileSync('src/data/questions-solo.json', JSON.stringify(shuffledSolo));
  
  console.log(`Base finale (serveur): ${finalGoodItems.length} articles`);
  console.log(`Base finale (solo): ${shuffledSolo.length} articles`);
}

main().catch(console.error);
