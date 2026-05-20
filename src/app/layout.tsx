import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aman Ply Wood Stock",
  description: "Search inventory by code and series, add or sell stock",
};

/** Tell the browser this UI is light-only so it does not use a dark page canvas. */
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f0f7ff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-full bg-[#f0f7ff] antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-[#f0f7ff] font-sans text-blue-900">
        <SiteHeader />
        <main className="flex flex-1 flex-col bg-[#f0f7ff]">{children}</main>
      </body>
    </html>
  );
}
