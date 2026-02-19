import type { Metadata } from "next";

import { Rajdhani, Space_Mono } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const displayFont = Rajdhani({
  variable: "--font-quantum-display",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const monoFont = Space_Mono({
  variable: "--font-quantum-mono",
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
      <body className={`${displayFont.variable} ${monoFont.variable} antialiased dark`}>
        <Providers>
          <div className="quantum-bg grid min-h-svh grid-rows-[auto_1fr]">
            <Header />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
