import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { CookieConsentBanner } from '@/components/shared/cookie-consent-banner'
import { QueryProvider } from '@/providers/query-provider'
import './globals.css'

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
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <QueryProvider>
          <div id="app-shell">{children}</div>
        </QueryProvider>
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
