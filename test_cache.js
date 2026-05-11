const axios = require('axios');
const cheerio = require('cheerio');

async function testCache() {
  try {
    const r = await axios.get('http://webcache.googleusercontent.com/search?q=cache:https://www.ebay.fr/sch/i.html?_nkw=ps5', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(r.data);
    const items = [];
    $('li.s-item').each((i, el) => {
      const title = $(el).find('.s-item__title').text();
      const price = $(el).find('.s-item__price').text();
      const img = $(el).find('img').attr('src');
      if (title && price && img) {
        items.push({title, price, img});
      }
    });
    console.log('Found:', items.length);
    if (items.length > 0) console.log(items[1]);
  } catch (e) {
    console.log('Error:', e.message);
  }
}
testCache();
