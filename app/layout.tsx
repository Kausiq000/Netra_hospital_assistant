import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Rajdhani, Noto_Sans_Tamil } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { I18nProvider } from '@/lib/i18n'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-rajdhani",
})

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-tamil",
})

export const metadata: Metadata = {
  title: 'NETRA - Smart Hospital Capacity Management',
  description: 'NETRA — the all-seeing eye for hospital operations. Optimize capacity, streamline patient flow, and manage resources in real time.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#4B7BF5',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${rajdhani.variable} ${notoSansTamil.variable} font-sans antialiased`}>
        <I18nProvider>
          {children}
          <Toaster position="top-right" richColors />
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  )
}
