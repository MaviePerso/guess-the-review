import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Guess The Review - Devine le prix et la note des produits !",
  description: "Un jeu addictif où vous devez deviner le prix et la note des produits Amazon et BestBuy. Testez vos connaissances du marché !",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8669837001236314" crossOrigin="anonymous"></script>
      </head>
      <body>
        <main style={{ minHeight: '90vh' }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}