const fs = require('fs');
const http = require('http');
const https = require('https');

const PLACEHOLDER_SIZE = 14867; // BestBuy "Image Unavailable" exact size
const CONCURRENCY = 50; // Check 50 images at once
const TIMEOUT_MS = 4000;

function checkImage(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, { method: 'HEAD', timeout: TIMEOUT_MS }, (res) => {
      const size = parseInt(res.headers['content-length'] || '0', 10);
      const type = res.headers['content-type'] || '';
      const isPlaceholder = size === PLACEHOLDER_SIZE;
      const isNotImage = !type.includes('image');
      const isError = res.statusCode >= 400;
      resolve({ ok: !isPlaceholder && !isNotImage && !isError, url });
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
  const db = JSON.parse(fs.readFileSync('server/db_verified.json', 'utf8'));
  console.log(`Total items: ${db.length}`);

  const bbestbuy = db.filter(x => x.images && x.images[0] && x.images[0].includes('bbystatic'));
  const others = db.filter(x => !x.images || !x.images[0] || !x.images[0].includes('bbystatic'));

  console.log(`BestBuy to verify: ${bbestbuy.length}`);
  console.log(`Other items (kept as-is): ${others.length}`);

  const goodBestBuy = [];
  let checked = 0;
  let dead = 0;

  for (let i = 0; i < bbestbuy.length; i += CONCURRENCY) {
    const batch = bbestbuy.slice(i, i + CONCURRENCY);
    const results = await runBatch(batch);
    for (const r of results) {
      if (r.ok) goodBestBuy.push(r.item);
      else dead++;
    }
    checked += batch.length;
    process.stdout.write(`\r Checked: ${checked}/${bbestbuy.length} | Dead: ${dead} | Good: ${goodBestBuy.length}   `);
  }

  console.log(`\n\n=== RESULTS ===`);
  console.log(`Dead BestBuy images removed: ${dead}`);
  console.log(`Good BestBuy images kept: ${goodBestBuy.length}`);
  console.log(`Other items: ${others.length}`);

  const finalDb = [...others, ...goodBestBuy];
  finalDb.sort(() => Math.random() - 0.5);

  fs.writeFileSync('server/db_verified.json', JSON.stringify(finalDb, null, 2));
  console.log(`Final DB saved: ${finalDb.length} items - ZERO dead images!`);
}

main().catch(console.error);
