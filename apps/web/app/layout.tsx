import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import { Toaster } from 'sonner'
import { CookieConsentBanner } from '@/components/shared/cookie-consent-banner'
import { QueryProvider } from '@/providers/query-provider'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

// Otimização de fonte: carregamento local com display swap
const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
  preload: true,
  fallback: ['Inter', 'Segoe UI', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'DESK IMPERIAL',
  description: 'Plataforma empresarial moderna com UX/UI premium, seguranca e observabilidade.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
    other: [{ rel: 'mask-icon', url: '/favicon.svg', color: '#9b8460' }],
  },
  // PWA e mobile optimization
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DESK IMPERIAL',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={outfit.variable} suppressHydrationWarning>
      <body
        className={`${outfit.className} bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <div id="app-shell">{children}</div>
          </QueryProvider>
        </ThemeProvider>
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          toastOptions={{
            style: {
              background: 'rgba(15,15,15,0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
        <div id="cookie-consent-root">
          <CookieConsentBanner />
        </div>
      </body>
    </html>
  )
}
