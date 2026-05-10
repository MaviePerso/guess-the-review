const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const { data } = await axios.get('https://www.amazon.fr/dp/B07N4PB1TD', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    const $ = cheerio.load(data);
    
    // Check if captcha
    if ($('form[action="/errors/validateCaptcha"]').length > 0) {
      console.log('Blocked by Captcha!');
      return;
    }

    const title = $('#productTitle').text().trim();
    const ratingText = $('#acrPopover').attr('title'); // e.g. "4,5 sur 5 étoiles"
    
    // images are in a script tag var data = { 'colorImages': { 'initial': [...] } }
    let images = [];
    const scriptContent = $('script:contains("ImageBlockATF")').html();
    if (scriptContent) {
      const match = scriptContent.match(/'initial':\s*(\[.+?\])/);
      if (match) {
        const imagesData = JSON.parse(match[1]);
        images = imagesData.map(img => img.hiRes || img.large);
      }
    }

    console.log('Title:', title);
    console.log('Global Rating:', ratingText);
    console.log('Images count:', images.length);
    console.log('Images:', images);

  } catch (err) {
    console.log('Error:', err.message);
  }
}
test();
