import type { Metadata } from 'next'
import { ShortlistProvider } from '@/components/site/ShortlistProvider'
import { Inter } from 'next/font/google'
import { ToasterProvider } from '@/components/ToasterProvider'
import { bootstrapApplication } from '@/lib/bootstrap'
import './globals.css'

const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap'
})

const displayFont = Inter({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
})

export const metadata: Metadata = {
  title: {
    default: 'Bes3',
    template: '%s | Bes3'
  },
  description: 'Bes3 helps shoppers compare real tech products, track pricing, and read high-signal buying guides.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg'
  }
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  await bootstrapApplication()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${displayFont.variable} font-sans`}>
        <ShortlistProvider>
          {children}
          <ToasterProvider />
        </ShortlistProvider>
      </body>
    </html>
  )
}
