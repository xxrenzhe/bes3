import type { Metadata } from 'next'
import { StructuredData } from '@/components/site/StructuredData'
import { ShortlistProvider } from '@/components/site/ShortlistProvider'
import { ToasterProvider } from '@/components/ToasterProvider'
import { bootstrapApplication } from '@/lib/bootstrap'
import { DEFAULT_SITE_NAME } from '@/lib/constants'
import { addLocaleToPath, buildLanguageAlternatesWithDefault, getHtmlLang, getOgLocale } from '@/lib/i18n'
import { getRequestLocale } from '@/lib/request-locale'
import { getSiteUrl } from '@/lib/site-url'
import { buildOrganizationSchema, buildWebsiteSchema } from '@/lib/structured-data'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const locale = getRequestLocale()
  const localizedHome = addLocaleToPath('/', locale)
  const alternates = buildLanguageAlternatesWithDefault('/')

  return {
    title: {
      default: DEFAULT_SITE_NAME,
      template: `%s | ${DEFAULT_SITE_NAME}`
    },
    description: 'Bes3 helps you find the right tech and home-office products with honest reviews, side-by-side comparisons, and live deals worth checking.',
    applicationName: DEFAULT_SITE_NAME,
    publisher: DEFAULT_SITE_NAME,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical: localizedHome,
      languages: Object.fromEntries(Object.entries(alternates))
    },
    keywords: ['tech buying guide', 'product reviews', 'product comparisons', 'live deals', 'brand directory'],
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
      url: localizedHome,
      siteName: DEFAULT_SITE_NAME,
      locale: getOgLocale(locale),
      title: DEFAULT_SITE_NAME,
      description: 'Bes3 helps you find the right tech and home-office products with honest reviews, side-by-side comparisons, and live deals worth checking.'
    },
    twitter: {
      card: 'summary',
      title: DEFAULT_SITE_NAME,
      description: 'Bes3 helps you find the right tech and home-office products with honest reviews, side-by-side comparisons, and live deals worth checking.'
    }
  }
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  await bootstrapApplication()
  const locale = getRequestLocale()

  return (
    <html lang={getHtmlLang(locale)} suppressHydrationWarning>
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
