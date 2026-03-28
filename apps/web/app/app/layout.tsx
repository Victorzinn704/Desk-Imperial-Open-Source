import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/providers/query-provider'
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

export default function AppMobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <ServiceWorkerRegistrar />
      <QueryProvider>{children}</QueryProvider>
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
    </>
  )
}
