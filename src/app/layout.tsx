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
  description: "Un jeu addictif oÃ¹ vous devez deviner le prix et la note des produits Amazon et BestBuy. Testez vos connaissances du marchÃ© !",
  openGraph: {
    title: "Guess The Review ðŸ†",
    description: "Devine le prix et la note des produits les plus fous du net !",
    url: "https://www.guess-the-review.com",
    siteName: "Guess The Review",
    // images: [
      {
        url: "",
        width: 1200,
        height: 630,
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Guess The Review ðŸ†",
    description: "Devine le prix et la note des produits les plus fous du net !",
    // images: [""],
  },
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
        <main style={{ minHeight: "90vh" }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}