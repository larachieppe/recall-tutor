"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on load so Recall is installable as a PWA and
 * can receive push. No-ops where service workers aren't supported. The worker
 * itself does no offline caching (see public/sw.js) — it exists for push and
 * installability only.
 */
export default function ServiceWorkerManager() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registration can fail in private mode / unsupported contexts — ignore */
    });
  }, []);
  return null;
}
