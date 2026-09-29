import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import PWARegister from "@/components/providers/PWARegister";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import ReferenceHeader from "@/components/layout/ReferenceHeader";
import ReferenceFooter from "@/components/layout/ReferenceFooter";
import ClientLayout from "./client-layout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://arata.co.kr"),
  title: {
    default: "ARATA COMICS | 웹툰 구독 플랫폼",
    template: "%s | ARATA COMICS",
  },
  description: "ARATA COMICS는 다양한 웹툰을 월정액으로 감상하는 구독형 웹툰 플랫폼입니다.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  verification: {
    other: {
      "naver-site-verification": "8aac87132104c63b253698ea095d3eb825d814c6",
    },
  },
  openGraph: {
    siteName: "ARATA COMICS",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ARATA COMICS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <style>{`body > header:not([data-reference-header="true"]) { display: none !important; }`}</style>
        <link
          rel="preload"
          href="https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_four@1.2/JalnanOTF00.woff"
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.variable} ${bebasNeue.variable} antialiased theme-light`}>
        <LanguageProvider>
          <ReferenceHeader />
          <QueryProvider>
            <ThemeProvider />
            <ClientLayout>{children}</ClientLayout>
          </QueryProvider>
          <ReferenceFooter />
          <PWARegister />
        </LanguageProvider>
      </body>
    </html>
  );
}
