"use client";

import { SessionProvider } from "next-auth/react";
import { AUTH_ENABLED } from "@/lib/auth-flag";
import CloudSync from "@/components/CloudSync";
import NotifyManager from "@/components/NotifyManager";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!AUTH_ENABLED) {
    return (
      <>
        <NotifyManager />
        {children}
      </>
    );
  }
  return (
    <SessionProvider>
      <CloudSync />
      <NotifyManager />
      {children}
    </SessionProvider>
  );
}
