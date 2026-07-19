/* Recall service worker — handles Web Push notifications so review reminders
 * can arrive even when the app tab is closed. Kept intentionally minimal (no
 * offline caching) to avoid surprising staleness. */

// A no-op fetch handler (network passthrough) — present so the app qualifies
// as installable, without introducing any offline caching / staleness.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = { title: "Recall", body: "You have reviews due.", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    /* payload wasn't JSON — use defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url || "/" },
      tag: "recall-due",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
