import type { Metadata } from "next";
import { JetBrains_Mono, Caveat } from "next/font/google";
import { GlobalNav } from "@/components/shell/GlobalNav";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "alphaBeta",
  description: "Discipline layer for empirical work.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${caveat.variable}`}>
      <body>
        <GlobalNav />
        {children}
      </body>
    </html>
  );
}
