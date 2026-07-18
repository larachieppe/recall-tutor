"use client";

import { useEffect } from "react";
import { loadLibrary } from "@/lib/library";
import { dueConcepts } from "@/lib/mastery";
import { notificationPermission, notifyDueReviews } from "@/lib/notify";

/**
 * On load, if the learner has granted notifications and has reviews due, fire a
 * reminder (at most once per day). Rendered once at the app root.
 */
export default function NotifyManager() {
  useEffect(() => {
    const t = setTimeout(() => {
      if (notificationPermission() !== "granted") return;
      const lib = loadLibrary();
      const due = dueConcepts(lib.mastery ?? {}).filter(
        (c) => c.sourceItemId && lib.items[c.sourceItemId],
      );
      if (due.length > 0) notifyDueReviews(due.length);
    }, 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
