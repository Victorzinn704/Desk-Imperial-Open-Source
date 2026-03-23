import type { Metadata } from 'next'
import { CookieConsentBanner } from '@/components/shared/cookie-consent-banner'
import { RouteThemeSync } from '@/components/shared/route-theme-sync'
import { QueryProvider } from '@/providers/query-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'DESK IMPERIAL',
  description: 'Plataforma empresarial moderna com UX/UI premium, seguranca e observabilidade.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <RouteThemeSync />
        <QueryProvider>
          <div id="app-shell">{children}</div>
        </QueryProvider>
        <div id="cookie-consent-root">
          <CookieConsentBanner />
        </div>
      </body>
    </html>
  )
}
