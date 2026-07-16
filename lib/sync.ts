import type { Library } from "./library";

/** Fetch the signed-in user's library from the server (null if none/unauth). */
export async function pullLibrary(): Promise<Library | null> {
  try {
    const res = await fetch("/api/library");
    if (!res.ok) return null;
    const data = await res.json();
    return (data.library as Library) ?? null;
  } catch {
    return null;
  }
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;

/** Debounced upsert of the whole library to the server. */
export function pushLibrary(lib: Library): void {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    fetch("/api/library", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ library: lib }),
    }).catch(() => {
      /* best-effort; local copy is the fallback */
    });
  }, 700);
}
