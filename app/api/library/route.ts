import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { libraries } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !db) {
    return NextResponse.json({ library: null }, { status: userId ? 200 : 401 });
  }
  const rows = await db
    .select()
    .from(libraries)
    .where(eq(libraries.userId, userId))
    .limit(1);
  return NextResponse.json({ library: rows[0]?.data ?? null });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !db) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const data = body.library;
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Invalid library" }, { status: 400 });
  }
  const now = new Date();
  await db
    .insert(libraries)
    .values({ userId, data, updatedAt: now })
    .onConflictDoUpdate({
      target: libraries.userId,
      set: { data, updatedAt: now },
    });
  return NextResponse.json({ ok: true });
}
