"use client";

import { signIn } from "next-auth/react";

/** Sign-in CTA shown when generation is blocked by the free-allowance gate. */
export default function SignInPrompt() {
  return (
    <button
      onClick={() => signIn("github")}
      className="mt-3 rounded-full px-5 py-2 text-[14px] font-semibold text-white transition hover:-translate-y-0.5"
      style={{ background: "var(--blue)" }}
    >
      Sign in with GitHub to keep going
    </button>
  );
}
