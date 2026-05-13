import { NextResponse } from "next/server";
import db from "@/data/questions-solo.json";

const LUXURY_BLACKLIST = ['lamborghini', 'ferrari', 'porsche', 'bugatti', 'bentley', 'maserati', 'rolls royce', 'mclaren', 'aston martin', 'maybach', 'supercar', 'hypercar', 'rolex', 'patek', 'audemars', 'omega', 'breitling', 'cartier', 'hublot', 'tag heuer', 'gucci', 'vuitton', 'hermes', 'hermès', 'prada', 'chanel', 'dior', 'balenciaga', 'versace', 'givenchy', 'yves saint', 'armani', 'burberry', 'tiffany', 'boucheron', 'bulgari', 'yacht', 'private jet', 'jet prive', 'mansion', 'penthouse', 'villa', 'chateau', 'luxury', 'luxe', 'prestige', 'platinum', 'diamond', 'emerald', 'ruby', 'sapphire', 'gold bar', 'rare edition', 'limited prestige', 'exclusive mansion', 'luxury estate'];

function isLuxury(item: any) {
  if (!item) return false;
  const text = `${item.productName || ''} ${item.title || ''} ${item.reviewText || ''} ${item.description || ''}`.toLowerCase();
  return LUXURY_BLACKLIST.some(kw => text.includes(kw));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get("count") || "10");
    
    // On mélange et on filtre
    const data = [...db];
    const shuffled = data.sort(() => 0.5 - Math.random());
    const clean = shuffled.filter((item: any) => !isLuxury(item));
    
    return NextResponse.json(clean.slice(0, count));
  } catch (error) {
    console.error("Error in solo questions API:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
