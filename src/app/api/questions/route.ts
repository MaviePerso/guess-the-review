import { NextRequest, NextResponse } from "next/server";
import db from "@/data/questions-solo.json";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const count = Math.min(parseInt(req.nextUrl.searchParams.get("count") || "10"), 50);
  const shuffled = [...(db as any[])].sort(() => Math.random() - 0.5).slice(0, count);
  return NextResponse.json(shuffled);
}
