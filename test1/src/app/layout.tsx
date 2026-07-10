import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import QueryProvider from "@/components/providers/QueryProvider";
import PWARegister from "@/components/providers/PWARegister";
import Footer from "@/components/layout/Footer";
import ThemeProvider from "@/components/providers/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ARATA - 매일 업데이트되는 웹툰",
    template: "%s | ARATA",
  },
  description: "매일/요일/신작/완결을 한 번에 즐기는 웹툰 플랫폼 ARATA",
  openGraph: {
    siteName: "ARATA",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = typeof window !== 'undefined' ? (window.localStorage.getItem('theme') || 'dark') : 'dark';
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased ${theme === 'light' ? 'theme-light' : 'theme-dark'}`}>
        <QueryProvider>
          <ThemeProvider />
          <Header />
          <main className="min-h-[calc(100dvh-56px)] pt-3 sm:pt-4 md:pt-6">{children}</main>
          <Footer />
        </QueryProvider>
        <PWARegister />
      </body>
    </html>
  );
}
