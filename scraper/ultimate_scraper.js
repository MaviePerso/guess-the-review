const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

const keywords = [
  "iphone", "macbook", "pc gamer", "ps5", "xbox series x", "nintendo switch", "guitare electrique",
  "drone dji", "casque bose", "airpods pro", "montre connectee", "baskets nike", "aspirateur dyson",
  "machine a cafe grain", "tv oled", "appareil photo reflex", "objectif canon", "clavier mecanique",
  "souris logitech", "ecran 144hz", "carte graphique rtx", "velo electrique", "trottinette electrique",
  "canapé d'angle", "lit king size", "chaise ergonomique", "bureau bois", "lampe rgb", "micro yeti",
  "tablette samsung", "ipad pro", "apple watch", "tapis de course", "haltères", "sac de frappe",
  "gants de boxe", "raquette de tennis", "ballon de foot", "maillot de foot", "lunettes de soleil ray ban",
  "parfum homme", "parfum femme", "sac a main cuir", "portefeuille", "veste en cuir", "manteau hiver",
  "jean levi's", "pull en laine", "casquette", "bonnet", "montre seiko", "bague diamant", "collier or",
  "boucles d'oreilles", "bracelet", "livre harry potter", "manga one piece", "bd tintin", "figurine pop",
  "lego star wars", "puzzle 1000 pieces", "jeu de societe catane", "monopoly", "cartes pokemon",
  "peluche géante", "voiture telecommandee", "circuit majorette", "barbie", "nerf elite", "pistolet a eau",
  "tente camping 4 places", "sac de couchage", "couteau suisse", "jumelles", "lampe torche puissante",
  "canne a peche", "kayak gonflable", "planche de surf", "combinaison neoprene", "masque de plongee",
  "ski", "snowboard", "casque moto", "blouson moto", "gants moto", "pneus voiture", "jantes alu",
  "autoradio bluetooth", "dashcam", "gps tomtom", "outillage bosch", "perceuse sans fil", "scie sauteuse",
  "tondeuse a gazon", "barbecue weber", "plancha", "salon de jardin", "parasol chauffant", "piscine tubulaire",
  "spa gonflable", "robot piscine", "robot aspirateur", "purificateur d'air", "ventilateur colonne",
  "climatiseur mobile", "chauffage d'appoint", "fer a repasser", "centrale vapeur", "machine a coudre",
  "friteuse sans huile", "robot patissier", "micro ondes encastrable", "four electrique", "plaque induction",
  "housse de couette", "oreiller ergonomique", "matelas emma", "sommier tapissier", "rideaux occultants",
  "tapis de salon", "miroir mural", "cadre photo", "horloge murale", "plante d'interieur", "vase ceramique",
  "bougie parfumee", "diffuseur huiles essentielles", "coffret cadeau", "box mensuelle", "carte cadeau",
  "costume t-rex", "perruque pour chien", "mug toilette", "coussin nicolas cage", "papier toilette humour",
  "chaussettes sandales", "parapluie banane", "masque de pigeon", "pull moche noel", "nain de jardin zombie",
  "bouée flamant rose", "lit chat requin", "casquette helice", "plaid burrito", "poulet hurlant",
  "mini golf toilette", "chaussons poisson", "pyjama licorne", "bonnet barbe", "sac a dos astronaute chat",
  "support taco dinosaure", "mini mains doigts", "cornichon yodel", "savon bacon", "chaussettes pizza",
  "masque cheval", "mug paresseux", "coussin corgi", "faux ventre biere", "moule gaufre clavier",
  "gants homard", "costume hot dog", "costume alien", "griffoir dj chat", "veilleuse toilette",
  "pull noel moche homme", "pull noel moche femme", "costume mario", "costume spiderman", "masque anonymous",
  "sabre laser", "baguette magique", "cape harry potter", "gant de l'infini", "bouclier captain america",
  "marteau thor", "casque iron man", "batmobile", "delorean retour vers le futur", "ectomobile ghostbusters",
  "faucon millenium lego", "etoile de la mort lego", "poudlard lego", "titanic lego", "bugatti lego"
];

const REVIEWS = [
  "Vraiment top, je recommande vivement !", "Conforme à la description, livraison rapide.",
  "Excellent rapport qualité-prix, très satisfait.", "Produit de bonne qualité, je suis impressionné.",
  "Parfait, ravi de l'achat.", "Très bonne qualité, solide et bien fini.",
  "Livraison rapide, produit conforme. Top vendeur !", "Fonctionnel et bien conçu.",
  "Super produit ! Tout est parfait.", "Article reçu en parfait état, merci !"
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomReview = () => rand(REVIEWS);
const randomRating = () => Math.round((3.0 + Math.random() * 2.0) * 10) / 10;
const sources = ["eBay", "Cdiscount", "Rakuten", "Fnac", "Darty", "Amazon"];

const DB_FILE = path.join(__dirname, '..', 'server', 'db_scraped_live.json');
let database = [];

if (fs.existsSync(DB_FILE)) {
  try {
    database = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    console.log(`Base de données chargée avec ${database.length} produits existants.`);
  } catch(e) {}
}

const seenUrls = new Set(database.map(item => item.url));

async function scrapeEbayItem(browser, itemUrl, fallbackTitle, fallbackPrice) {
  if (seenUrls.has(itemUrl)) return null;
  const page = await browser.newPage();
  try {
    await page.goto(itemUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    const title = await page.$eval('.x-item-title__mainTitle', el => el.innerText.trim()).catch(() => fallbackTitle);
    const priceStr = await page.$eval('.x-price-primary', el => el.innerText.trim()).catch(() => fallbackPrice);
    
    let price = 0;
    if (priceStr) {
      price = parseFloat(priceStr.replace(/[^0-9,.]/g, '').replace(',', '.'));
    }
    
    const images = await page.evaluate(() => {
      const imgs = [];
      document.querySelectorAll('.ux-image-filmstrip-carousel-item img').forEach(el => {
        const src = el.src || el.getAttribute('data-src') || '';
        if (src) imgs.push(src.replace(/s-l\d+/, 's-l1600'));
      });
      if (imgs.length === 0) {
        document.querySelectorAll('.ux-image-carousel-item img').forEach(el => {
           const src = el.src || el.getAttribute('data-src') || '';
           if(src) imgs.push(src.replace(/s-l\d+/, 's-l1600'));
        });
      }
      return [...new Set(imgs)];
    });

    await page.close();

    if (images.length > 0 && price > 0) {
      const item = {
        productName: title,
        price: price,
        images: images,
        source: rand(sources),
        reviewText: randomReview(),
        realRating: randomRating(),
        url: itemUrl
      };
      return item;
    }
    return null;

  } catch (e) {
    await page.close().catch(()=>{});
    return null;
  }
}

async function runScraper() {
  console.log("=== DÉMARRAGE DU MEGA SCRAPER ===");
  console.log("Ce script va tourner en boucle et ajouter tous les produits trouvés.");
  console.log("Il navigue dans chaque page produit pour récupérer TOUTES les images.");
  console.log("Appuyez sur CTRL+C pour arrêter à tout moment. La base est sauvegardée à chaque produit.");
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-minimized']
  });

  const searchPage = await browser.newPage();

  while(true) {
    const shuffledKeywords = keywords.sort(() => 0.5 - Math.random());
    
    for (const kw of shuffledKeywords) {
      console.log(`\nRecherche de: ${kw}`);
      
      try {
        const pageNum = Math.floor(Math.random() * 5) + 1;
        await searchPage.goto(`https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(kw)}&_pgn=${pageNum}&_ipg=240`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const itemsList = await searchPage.evaluate(() => {
          const links = [];
          document.querySelectorAll('li.s-item').forEach(el => {
            const link = el.querySelector('a.s-item__link')?.href;
            const title = el.querySelector('.s-item__title')?.innerText;
            const price = el.querySelector('.s-item__price')?.innerText;
            if (link && !link.includes('Shop on eBay')) {
              links.push({ link: link.split('?')[0], title, price });
            }
          });
          return links;
        });

        console.log(`${itemsList.length} résultats trouvés. Visite des fiches produits...`);

        for (let i = 0; i < itemsList.length; i++) {
          const itemInfo = itemsList[i];
          if (seenUrls.has(itemInfo.link)) continue;

          console.log(`[${i+1}/${itemsList.length}] Scraping: ${itemInfo.title ? itemInfo.title.substring(0, 40) : '...'}`);
          const product = await scrapeEbayItem(browser, itemInfo.link, itemInfo.title, itemInfo.price);
          
          if (product) {
            database.push(product);
            seenUrls.add(product.url);
            
            fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));
            console.log(`✅ Ajouté ! (${product.images.length} images) | Total DB: ${database.length} produits.`);
          } else {
             console.log(`❌ Échec ou ignoré.`);
          }
          
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        }

      } catch (e) {
        console.error(`Erreur sur la recherche ${kw}:`, e.message);
      }
    }
  }
}

runScraper().catch(console.error);
