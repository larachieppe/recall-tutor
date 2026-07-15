import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recall — active-recall tutor",
  description:
    "Turn any link or file into medium-difficulty practice questions with rubric-based feedback.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
