import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { parseBody, pushSubscribeInput } from "@/lib/schemas";
import { pushConfigured } from "@/lib/push-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!rateLimit(`push-sub:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!db || !pushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications are not enabled on this server." },
      { status: 503 },
    );
  }

  const parsed = parseBody(pushSubscribeInput, await req.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const { endpoint, keys } = parsed.data;

  await db
    .insert(pushSubscriptions)
    .values({ endpoint, userId, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: keys.p256dh, auth: keys.auth },
    });

  return NextResponse.json({ ok: true });
}
