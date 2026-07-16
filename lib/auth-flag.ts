/**
 * Whether the Sign-in / cloud-sync UI is turned on. Set
 * NEXT_PUBLIC_AUTH_ENABLED=true (alongside the Neon + Auth.js secrets) to
 * enable it. When unset, the app runs local-only exactly as before.
 */
export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
