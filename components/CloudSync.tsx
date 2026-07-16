"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { loadLibrary, saveLibraryRaw } from "@/lib/library";
import { pullLibrary, pushLibrary } from "@/lib/sync";

/**
 * Keeps localStorage mirrored with the server for signed-in users. Rendered
 * once at the app root, inside SessionProvider. On sign-in it pulls the server
 * copy (or pushes the local one if the server is empty); afterwards it pushes
 * whenever the local library changes.
 */
export default function CloudSync() {
  const { status } = useSession();
  const hydrated = useRef(false);

  // Reconcile on sign-in.
  useEffect(() => {
    if (status !== "authenticated" || hydrated.current) return;
    hydrated.current = true;
    (async () => {
      const remote = await pullLibrary();
      const local = loadLibrary();
      if (remote?.items && Object.keys(remote.items).length > 0) {
        saveLibraryRaw(remote);
        window.dispatchEvent(new Event("recall:lib-remote"));
      } else if (Object.keys(local.items).length > 0) {
        pushLibrary(local);
      }
    })();
  }, [status]);

  // Push on local changes.
  useEffect(() => {
    function onLocalChange() {
      if (status === "authenticated") pushLibrary(loadLibrary());
    }
    window.addEventListener("recall:lib-local", onLocalChange);
    return () => window.removeEventListener("recall:lib-local", onLocalChange);
  }, [status]);

  return null;
}
