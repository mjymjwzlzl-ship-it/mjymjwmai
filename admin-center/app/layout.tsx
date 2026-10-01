import type { Metadata } from 'next'
import { Inter } from "next/font/google";
import './globals.css'
import { Suspense } from 'react';
import AdminAuthGuard from '@/components/AdminAuthGuard'
import AdminThemeProvider from '@/components/AdminThemeProvider';
import { ADMIN_THEME_BOOTSTRAP } from '@/lib/admin-theme';

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
    <html lang="ko" data-admin-theme="light" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: ADMIN_THEME_BOOTSTRAP }} /></head>
      <body className={`${inter.variable} antialiased`}>
        <AdminThemeProvider><Suspense fallback={<div className="p-8">관리자 센터를 불러오는 중입니다.</div>}><AdminAuthGuard>{children}</AdminAuthGuard></Suspense></AdminThemeProvider>
      </body>
    </html>
  )
}
