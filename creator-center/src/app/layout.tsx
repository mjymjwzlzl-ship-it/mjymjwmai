import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARATA 작가센터",
  description: "ARATA 웹툰 작가를 위한 콘텐츠 업로드 및 관리 플랫폼",
  icons: {
    icon: [
      { url: '/arata-logo.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
    ],
    shortcut: '/arata-logo.svg',
    apple: '/arata-logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} antialiased theme-dark`}>
        {children}
      </body>
    </html>
  );
}
