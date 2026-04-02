import type { Metadata, Viewport } from 'next'
import { ServiceWorkerRegistrar } from '@/components/shared/sw-registrar'

export const metadata: Metadata = {
  title: 'Desk Imperial — Operacional',
  description: 'Sistema operacional móvel para garçons e proprietários.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Desk Imperial',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
}

/**
 * Layout do módulo /app (mobile-first).
 * CORREÇÃO: QueryProvider e Toaster removidos pois já estão no RootLayout.
 * Ter 2 instâncias de QueryClient causava cache inconsistente entre rotas.
 * Ter 2 Toasters causava notificações duplicadas.
 */
export default function AppMobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <ServiceWorkerRegistrar />
      {children}
    </>
  )
}
