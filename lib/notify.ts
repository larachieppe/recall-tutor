import { dayKey } from "./streak";

/**
 * Browser notifications for due reviews. These fire while the app is open (or
 * the tab is backgrounded). True closed-browser push would need a service
 * worker + Push API + a backend to send it — a future step.
 */

const KEY = "recall.notify.lastday";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

export async function requestNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

function alreadyNotifiedToday(): boolean {
  try {
    return localStorage.getItem(KEY) === dayKey();
  } catch {
    return false;
  }
}

/** Fire a "reviews due" notification, at most once per day. */
export function notifyDueReviews(count: number): void {
  if (
    !notificationsSupported() ||
    Notification.permission !== "granted" ||
    count <= 0 ||
    alreadyNotifiedToday()
  ) {
    return;
  }
  try {
    new Notification("Recall — reviews due", {
      body: `${count} concept${count === 1 ? "" : "s"} due for review. Keep your streak going!`,
    });
    localStorage.setItem(KEY, dayKey());
  } catch {
    /* notifications can throw in some contexts; ignore */
  }
}
