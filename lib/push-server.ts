import webpush from "web-push";

/**
 * Server-side Web Push. Everything here is gated behind VAPID env vars, so the
 * whole feature is inert until the keys are set — matching how the DB and auth
 * degrade gracefully. Generate a key pair once with:
 *
 *   npx web-push generate-vapid-keys
 *
 * then set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (a mailto: URL),
 * and NEXT_PUBLIC_VAPID_PUBLIC_KEY (same public key, for the browser).
 */

let configured = false;

export function pushConfigured(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      pub,
      priv,
    );
    configured = true;
  }
  return true;
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Send one notification. Returns "ok", or "gone" when the subscription is no
 * longer valid (HTTP 404/410) so the caller can delete it, or "error".
 */
export async function sendPush(
  sub: StoredSubscription,
  payload: { title: string; body: string; url?: string },
): Promise<"ok" | "gone" | "error"> {
  if (!pushConfigured()) return "error";
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
    );
    return "ok";
  } catch (err: unknown) {
    const status =
      typeof err === "object" && err !== null && "statusCode" in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
    if (status === 404 || status === 410) return "gone";
    return "error";
  }
}
