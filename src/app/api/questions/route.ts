import { NextRequest, NextResponse } from "next/server";
import db from "@/data/questions-solo.json";

export const dynamic = "force-dynamic";

const LUXURY_BLACKLIST = [
  'lamborghini', 'ferrari', 'porsche', 'bugatti', 'bentley', 'maserati',
  'rolls royce', 'mclaren', 'aston martin', 'maybach', 'supercar', 'hypercar',
  'rolex', 'patek', 'audemars', 'breitling',
  'gucci', 'vuitton', 'hermes', 'prada', 'chanel', 'dior', 'balenciaga',
  'versace', 'givenchy', 'yves saint', 'armani', 'burberry',
  'tiffany', 'boucheron', 'bulgari',
  'yacht', 'private jet', 'jet prive',
  'mansion', 'penthouse', 'villa', 'chateau',
  'luxury', 'luxe', 'prestige', 'platinum edition', 'diamond edition',
  'rare edition', 'gold edition', 'limited prestige',
];

function isLuxury(productName: string) {
  const name = (productName || '').toLowerCase();
  return LUXURY_BLACKLIST.some(kw => name.includes(kw));
}

export async function GET(req: NextRequest) {
  try {
    const count = Math.min(parseInt(req.nextUrl.searchParams.get("count") || "10"), 50);
    const data = db as any[];
    
    if (!data || !Array.isArray(data)) {
        return NextResponse.json({ error: "Base de données corrompue" }, { status: 500 });
    }

    const clean = data.filter((item: any) => !isLuxury(item.productName));
    const shuffled = [...clean].sort(() => Math.random() - 0.5).slice(0, count);
    return NextResponse.json(shuffled, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (err) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
