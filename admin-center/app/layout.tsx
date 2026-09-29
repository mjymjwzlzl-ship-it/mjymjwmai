import type { Metadata } from 'next'
import { Inter } from "next/font/google";
import './globals.css'

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'ARATA 관리자 센터',
  description: '웹툰 플랫폼 관리자 센터',
  icons: {
    icon: [
      { url: '/arata-logo.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
    ],
    shortcut: '/arata-logo.svg',
    apple: '/arata-logo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} antialiased theme-dark`}>
        {children}
      </body>
    </html>
  )
}