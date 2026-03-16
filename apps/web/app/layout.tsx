import type { Metadata } from 'next'
import { CookieConsentBanner } from '@/components/shared/cookie-consent-banner'
import { QueryProvider } from '@/providers/query-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Partner Portal',
  description: 'Portal empresarial moderno com UX/UI premium, seguranca e observabilidade.',
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
          {children}
          <CookieConsentBanner />
        </QueryProvider>
      </body>
    </html>
  )
}
