import { NextRequest, NextResponse } from "next/server";
import db from "@/data/questions-solo.json";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const count = Math.min(parseInt(req.nextUrl.searchParams.get("count") || "10"), 50);
    const data = db as any[];
    
    if (!data || !Array.isArray(data)) {
        return NextResponse.json({ error: "Base de données corrompue" }, { status: 500 });
    }

    const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, count);
    return NextResponse.json(shuffled);
  } catch (err) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}