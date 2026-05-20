import type { Metadata, Viewport } from 'next'
import { ServiceWorkerRegistrar } from '@/components/shared/sw-registrar'
import '../design-lab/lab.css'

export const metadata: Metadata = {
  title: 'Desk Imperial Lite',
  description: 'Canal Lite com duas trilhas: Web Lite e PWA Lite.',
  manifest: '/manifest-lite.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Desk Lite',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d0d' },
  ],
}

export default function LiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="lab-root lab-dark min-h-screen" data-lab>
      <ServiceWorkerRegistrar scope="/lite/" scriptUrl="/sw-lite.js" />
      <main className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-5 sm:py-6">{children}</main>
    </div>
  )
}
