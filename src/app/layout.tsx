import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import "./globals.css";
import "katex/dist/katex.min.css";
import { AuthProvider } from "@/context/AuthContext";

const geist = localFont({
  src: "./fonts/geist/Geist-Variable.woff2",
  variable: "--font-geist",
  weight: "100 900",
});

const baskervville = localFont({
  src: [
    { path: "./fonts/baskervville/baskervville-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/baskervville/baskervville-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-baskervville",
});

export const metadata: Metadata = {
  title: "Molecular Zettelkasten",
  description: "A secure, specialized personal knowledge base.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#141513",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading request headers opts every page into dynamic rendering, which the
  // per-request CSP nonce set in src/proxy.ts requires.
  await headers();

  return (
    <html
      lang="en"
      className={`${geist.variable} ${baskervville.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
