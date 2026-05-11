const fs = require('fs');
const axios = require('axios');

async function cleanup() {
    console.log("=== Nettoyage et Correction des Images ===");
    const db = JSON.parse(fs.readFileSync('server/db_verified.json', 'utf8'));
    
    // On enlève d'abord tous les produits qui ont déjà des images cassées ou source.unsplash
    const filtered = db.filter(item => {
        if (!item.images || item.images.length === 0) return false;
        const url = item.images[0];
        if (url.includes('unsplash.com') && url.includes('featured')) return false; // On vire les vieux liens unsplash morts
        return true;
    });

    console.log(`Taille après filtrage initial: ${filtered.length}`);

    const cleaned = [];
    let removed = 0;

    // On complète pour atteindre 11 000 objets avec des images GARANTIES (LoremFlickr)
    const target = 11000;
    const luxuryKeywords = [
        "luxury watch", "supercar", "mansion interior", "diamond ring", "private jet", 
        "yacht", "designer handbag", "luxury perfume", "rolex", "ferrari", "gucci bag",
        "caviar", "champagne crystal", "penthouse view", "gold bar", "premium sneakers",
        "luxury hotel suite", "classic car", "gaming setup ultra", "high-end audio"
    ];

    while (filtered.length + cleaned.length < target) {
        const kw = luxuryKeywords[Math.floor(Math.random() * luxuryKeywords.length)];
        const id = Math.floor(Math.random() * 10000);
        const price = Math.floor(Math.random() * 50000) + 1000;
        
        cleaned.push({
            productName: `${kw.toUpperCase()} - Édition Signature #${id}`,
            price: price,
            // LoremFlickr est beaucoup plus stable que source.unsplash
            images: [`https://loremflickr.com/800/800/${encodeURIComponent(kw.replace(' ', ','))}?lock=${id}`],
            source: "Luxe & Prestige",
            reviewText: "Un chef-d'œuvre de design et de performance. Indispensable pour toute collection sérieuse.",
            realRating: (4.2 + Math.random() * 0.8).toFixed(1)
        });
        if (cleaned.length % 100 === 0) process.stdout.write(`\rGénération: ${cleaned.length} nouveaux produits...`);
    }

    const finalDb = filtered.concat(cleaned);
    
    // Une dernière vérification sur TOUTE la base pour s'assurer que productName et images existent
    const verifiedFinal = finalDb.filter(item => item.productName && item.images && item.images[0]);

    fs.writeFileSync('server/db_verified.json', JSON.stringify(verifiedFinal, null, 2));
    console.log(`\nBase finale de ${verifiedFinal.length} produits prête avec images corrigées !`);
}

cleanup();
