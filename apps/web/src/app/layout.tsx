import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";

const satoshi = localFont({
  src: "../../public/fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dreamKudos = localFont({
  src: "../../public/fonts/DreamKudos.ttf",
  variable: "--font-dream-kudos",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WaveStack",
  description: "Creator automation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${satoshi.variable} ${geistMono.variable} ${dreamKudos.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
