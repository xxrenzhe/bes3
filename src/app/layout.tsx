import type { Metadata } from 'next'
import { StructuredData } from '@/components/site/StructuredData'
import { ShortlistProvider } from '@/components/site/ShortlistProvider'
import { ToasterProvider } from '@/components/ToasterProvider'
import { bootstrapApplication } from '@/lib/bootstrap'
import { DEFAULT_SITE_NAME } from '@/lib/constants'
import { getSiteUrl } from '@/lib/site-url'
import { buildOrganizationSchema, buildWebsiteSchema } from '@/lib/structured-data'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: DEFAULT_SITE_NAME,
    template: `%s | ${DEFAULT_SITE_NAME}`
  },
  description: 'Bes3 helps you find the right tech and home-office products with honest reviews, side-by-side comparisons, and live deals worth checking.',
  applicationName: DEFAULT_SITE_NAME,
  publisher: DEFAULT_SITE_NAME,
  metadataBase: new URL(getSiteUrl()),
  alternates: {
    canonical: '/'
  },
  keywords: ['tech buying guide', 'product reviews', 'product comparisons', 'verified deals', 'brand directory'],
  robots: {
    index: true,
    follow: true
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg'
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: DEFAULT_SITE_NAME,
    locale: 'en_US',
    title: DEFAULT_SITE_NAME,
    description: 'Bes3 helps you find the right tech and home-office products with honest reviews, side-by-side comparisons, and live deals worth checking.'
  },
  twitter: {
    card: 'summary',
    title: DEFAULT_SITE_NAME,
    description: 'Bes3 helps you find the right tech and home-office products with honest reviews, side-by-side comparisons, and live deals worth checking.'
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
      <body className="font-sans">
        <StructuredData data={[buildOrganizationSchema(), buildWebsiteSchema()]} />
        <ShortlistProvider>
          {children}
          <ToasterProvider />
        </ShortlistProvider>
      </body>
    </html>
  )
}
