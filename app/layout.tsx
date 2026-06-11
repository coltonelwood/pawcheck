import type { Metadata, Viewport } from 'next'
import './globals.css'
import PWAManager from '@/components/PWAManager'

// Single source of truth for the site URL — swapping domains is one env change.
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pawcheck.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'PawCheck — AI Pet Health Assessment',
  description:
    "Photograph your pet's concern. Get instant AI-powered health guidance with urgency assessment and clear next steps. Not a substitute for veterinary care.",
  keywords: [
    'pet health',
    'AI vet',
    'dog health app',
    'cat health app',
    'pet symptom checker',
    'pet first aid',
  ],
  authors: [{ name: 'PawCheck' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PawCheck',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'PawCheck — AI Pet Health Assessment',
    description:
      'Instant AI-powered health guidance for your dog or cat. Photograph the concern, get an urgency assessment and clear next steps.',
    type: 'website',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PawCheck — AI Pet Health Assessment',
    description:
      'Instant AI-powered health guidance for your dog or cat.',
  },
}

export const viewport: Viewport = {
  themeColor: '#2D5A4E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen texture-paper">
        {children}
        <PWAManager />
      </body>
    </html>
  )
}
