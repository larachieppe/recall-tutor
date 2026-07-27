import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

const DESCRIPTION =
  "Turn any link, file, or notes into medium-difficulty practice questions with rubric-based feedback.";

export const metadata: Metadata = {
  // Lets relative URLs below (og:image, etc.) resolve to absolute ones
  // automatically - required for link-preview crawlers (LinkedIn, etc.),
  // which fetch metadata directly rather than resolving relative to the page.
  metadataBase: new URL("https://recall-tutor.onrender.com"),
  title: "Recall — active-recall tutor",
  description: DESCRIPTION,
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
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Recall",
    title: "Recall — active-recall tutor",
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recall — active-recall tutor",
    description: DESCRIPTION,
    images: ["/og-image.png"],
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
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
