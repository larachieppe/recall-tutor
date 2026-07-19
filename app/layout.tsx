import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Recall — active-recall tutor",
  description:
    "Turn any link, file, or notes into medium-difficulty practice questions with rubric-based feedback.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Recall",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0020bb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
