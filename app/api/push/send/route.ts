import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { libraries, pushSubscriptions } from "@/lib/db/schema";
import { pushConfigured, sendPush } from "@/lib/push-server";
import { dueConcepts, type MasteryMap } from "@/lib/mastery";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sends "reviews due" push notifications. Meant to be hit once a day by an
 * external scheduler (e.g. cron-job.org or a GitHub Actions scheduled workflow)
 * with an Authorization: Bearer <CRON_SECRET> header. For each signed-in user's
 * subscription, it reads their stored library, counts due concepts, and only
 * notifies when something is actually due — so it's personalized, not spammy.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") || "";
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db || !pushConfigured()) {
    return NextResponse.json(
      { error: "Push is not enabled on this server." },
      { status: 503 },
    );
  }

  const subs = await db.select().from(pushSubscriptions);
  const userIds = [
    ...new Set(subs.map((s) => s.userId).filter((id): id is string => !!id)),
  ];

  // Load each subscribed user's library once, to compute due counts.
  const libRows = userIds.length
    ? await db
        .select()
        .from(libraries)
        .where(inArray(libraries.userId, userIds))
    : [];
  const dueByUser = new Map<string, number>();
  for (const row of libRows) {
    const mastery = (row.data as { mastery?: MasteryMap })?.mastery ?? {};
    dueByUser.set(row.userId, dueConcepts(mastery).length);
  }

  let sent = 0;
  let cleaned = 0;
  let skipped = 0;

  for (const sub of subs) {
    // Only notify signed-in users we have due data for, and only when due > 0.
    const due = sub.userId ? (dueByUser.get(sub.userId) ?? 0) : 0;
    if (due <= 0) {
      skipped++;
      continue;
    }
    const result = await sendPush(sub, {
      title: "Recall — reviews due",
      body: `${due} concept${due === 1 ? "" : "s"} due for review. Keep your streak going!`,
      url: "/",
    });
    if (result === "ok") sent++;
    else if (result === "gone") {
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, sub.endpoint));
      cleaned++;
    }
  }

  return NextResponse.json({
    subscriptions: subs.length,
    sent,
    cleaned,
    skipped,
  });
}
