import type { Metadata } from "next";

import { Public_Sans, Space_Mono, Syne } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const displayFont = Syne({
  variable: "--font-syne",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
});

const bodyFont = Public_Sans({
  variable: "--font-public-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const monoFont = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Segmentation API Dashboard",
  description: "SAM3 usage, request history, API keys, and credit purchases.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased`}
      >
        <Providers>
          <div className="marketing-shell grid min-h-svh grid-rows-[auto_1fr]">
            <Header />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
