import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

// On Render, AUTH_URL doesn't have to be set manually: derive it from the
// platform's auto-provided external URL so OAuth callbacks use the public host
// instead of the internal localhost:PORT bind address.
if (!process.env.AUTH_URL && process.env.RENDER_EXTERNAL_URL) {
  process.env.AUTH_URL = process.env.RENDER_EXTERNAL_URL;
}

// Only enable the GitHub provider when its credentials are present, so the app
// (and the build) work fine before auth is configured.
const providers =
  process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET ? [GitHub] : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: db
    ? DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  session: { strategy: db ? "database" : "jwt" },
  providers,
  callbacks: {
    session({ session, user }) {
      if (session.user && user) session.user.id = user.id;
      return session;
    },
  },
});
