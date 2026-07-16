// Loads .env.local into process.env (for local script runs) BEFORE any module
// that reads the keys is imported. Import this first.
import { readFileSync } from "node:fs";

try {
  const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
} catch {
  // no .env.local — rely on the real environment
}
