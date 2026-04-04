import type { Metadata } from 'next'
import { StructuredData } from '@/components/site/StructuredData'
import { ShortlistProvider } from '@/components/site/ShortlistProvider'
import { Inter } from 'next/font/google'
import { ToasterProvider } from '@/components/ToasterProvider'
import { bootstrapApplication } from '@/lib/bootstrap'
import { DEFAULT_SITE_NAME } from '@/lib/constants'
import { getSiteUrl } from '@/lib/site-url'
import { buildOrganizationSchema, buildWebsiteSchema } from '@/lib/structured-data'
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
    default: DEFAULT_SITE_NAME,
    template: `%s | ${DEFAULT_SITE_NAME}`
  },
  description: 'Bes3 helps shoppers compare real tech products, track pricing, and read high-signal buying guides.',
  applicationName: DEFAULT_SITE_NAME,
  publisher: DEFAULT_SITE_NAME,
  metadataBase: new URL(getSiteUrl()),
  formatDetection: {
    address: false,
    email: false,
    telephone: false
  },
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
        <StructuredData data={[buildOrganizationSchema(), buildWebsiteSchema()]} />
        <ShortlistProvider>
          {children}
          <ToasterProvider />
        </ShortlistProvider>
      </body>
    </html>
  )
}
