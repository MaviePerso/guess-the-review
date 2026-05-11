const fs = require('fs');
const axios = require('axios');

async function build() {
    console.log("=== Construction de la base de données ULTIME (Zéro mort) ===");
    
    let db = [];

    // 1. DUMMYJSON (100 Produits Garantis)
    try {
        const res = await axios.get('https://dummyjson.com/products?limit=100');
        res.data.products.forEach(item => {
            db.push({
                productName: item.title,
                price: item.price,
                images: item.images,
                source: "Amazon",
                reviewText: item.description,
                realRating: item.rating.toFixed(1)
            });
        });
        console.log(`DummyJSON: ${res.data.products.length}`);
    } catch(e) {}

    // 2. MAKEUP API (~900 Produits Garantis)
    try {
        const res = await axios.get('http://makeup-api.herokuapp.com/api/v1/products.json');
        res.data.forEach(item => {
            if (item.image_link && item.price > 0) {
                db.push({
                    productName: `${item.brand} - ${item.name}`,
                    price: parseFloat(item.price) || 25,
                    images: [item.image_link],
                    source: "Sephora",
                    reviewText: item.description || "Un produit de beauté exceptionnel.",
                    realRating: (3.5 + Math.random() * 1.5).toFixed(1)
                });
            }
        });
        console.log(`Makeup API: ${res.data.length}`);
    } catch(e) {}

    // 3. MASSIVE LUXURY INJECTION (500+ Items)
    const luxuryCats = [
        { kw: "Rolex Watch", priceRange: [8000, 50000], img: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=800" },
        { kw: "Ferrari", priceRange: [200000, 500000], img: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&q=80&w=800" },
        { kw: "Gucci Bag", priceRange: [1500, 4000], img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800" },
        { kw: "Luxury Mansion", priceRange: [2000000, 10000000], img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=800" },
        { kw: "Yacht", priceRange: [500000, 5000000], img: "https://images.unsplash.com/photo-1567899378494-47b22a2ad96a?auto=format&fit=crop&q=80&w=800" },
        { kw: "Rolex Daytona", priceRange: [25000, 60000], img: "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&q=80&w=800" },
        { kw: "Porsche 911", priceRange: [120000, 250000], img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800" },
        { kw: "Lamborghini", priceRange: [250000, 600000], img: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&q=80&w=800" },
        { kw: "Diamond Necklace", priceRange: [5000, 100000], img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800" }
    ];

    for (let i = 0; i < 500; i++) {
        const cat = luxuryCats[i % luxuryCats.length];
        const price = Math.floor(Math.random() * (cat.priceRange[1] - cat.priceRange[0])) + cat.priceRange[0];
        db.push({
            productName: `${cat.kw} - Platinum Edition ${i}`,
            price: price,
            images: [`${cat.img}&sig=${i}`], // Direct Unsplash API is more stable than source.unsplash
            source: "Prestige & Luxe",
            reviewText: "Une pièce d'exception, réservée à l'élite. Qualité irréprochable.",
            realRating: (4.5 + Math.random() * 0.5).toFixed(1)
        });
    }
    console.log("Luxury Injected: 500");

    // 4. CLEAN BESTBUY (Take only the very best 5000)
    if (fs.existsSync('server/db_10k.json')) {
        const bestbuy = JSON.parse(fs.readFileSync('server/db_10k.json', 'utf8'));
        const cleanedBestBuy = bestbuy.filter(item => 
            item.images && 
            item.images[0] && 
            item.images[0].includes('bbystatic.com') &&
            !item.productName.toLowerCase().includes('book') &&
            !item.productName.toLowerCase().includes('livre')
        ).slice(0, 5000);
        
        db = db.concat(cleanedBestBuy);
        console.log(`BestBuy Cleaned: ${cleanedBestBuy.length}`);
    }

    // FINAL SHUFFLE
    db = db.sort(() => Math.random() - 0.5);

    fs.writeFileSync('server/db_verified.json', JSON.stringify(db, null, 2));
    console.log(`Total Final: ${db.length}`);
}

build();
