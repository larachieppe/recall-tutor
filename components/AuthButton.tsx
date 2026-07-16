"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data, status } = useSession();
  if (status === "loading") return null;

  if (!data?.user) {
    return (
      <button
        onClick={() => signIn("github")}
        className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition"
        style={{ background: "var(--blue)" }}
      >
        Sign in to sync
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <span
        className="hidden text-[13px] font-medium sm:inline"
        style={{ color: "var(--muted)" }}
      >
        {data.user.name || data.user.email}
      </span>
      <button
        onClick={() => signOut()}
        className="rounded-full border px-3 py-1.5 text-[13px] font-semibold transition hover:bg-[var(--tint)]"
        style={{ borderColor: "var(--line)", color: "var(--ink)" }}
      >
        Sign out
      </button>
    </div>
  );
}
