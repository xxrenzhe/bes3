import type { Metadata } from 'next'
import { Manrope, Space_Grotesk } from 'next/font/google'
import { ToasterProvider } from '@/components/ToasterProvider'
import { bootstrapApplication } from '@/lib/bootstrap'
import './globals.css'

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap'
})

const displayFont = Space_Grotesk({
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
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
        {children}
        <ToasterProvider />
      </body>
    </html>
  )
}
