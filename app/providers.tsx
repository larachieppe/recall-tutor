"use client";

import { SessionProvider } from "next-auth/react";
import { AUTH_ENABLED } from "@/lib/auth-flag";
import CloudSync from "@/components/CloudSync";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!AUTH_ENABLED) return <>{children}</>;
  return (
    <SessionProvider>
      <CloudSync />
      {children}
    </SessionProvider>
  );
}
