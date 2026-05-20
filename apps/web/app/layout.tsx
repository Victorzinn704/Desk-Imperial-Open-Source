import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import { Toaster, type ToasterProps } from 'sonner'
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

const toasterOffset = {
  bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
  left: '1rem',
  right: '1rem',
  top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
} satisfies Exclude<ToasterProps['offset'], string | number | undefined>

const toasterMobileInsetX = 'max(0.75rem, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px))'

const toasterMobileOffset = {
  bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
  left: toasterMobileInsetX,
  right: toasterMobileInsetX,
  top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
} satisfies Exclude<ToasterProps['mobileOffset'], string | number | undefined>

const toastStyle = {
  backdropFilter: 'blur(12px)',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
} satisfies React.CSSProperties

export const metadata: Metadata = {
  title: 'DESK IMPERIAL',
  description: 'Plataforma empresarial moderna com UX/UI premium, seguranca e observabilidade.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
    other: [{ rel: 'mask-icon', url: '/favicon.svg', color: '#008cff' }],
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html suppressHydrationWarning className={outfit.variable} lang="pt-BR">
      <body className={`${outfit.className} bg-[var(--bg)] text-[var(--text-primary)] antialiased transition-colors`}>
        <ThemeProvider enableSystem attribute="class" defaultTheme="system">
          <QueryProvider>
            <div id="app-shell">{children}</div>
          </QueryProvider>
        </ThemeProvider>
        <Toaster
          richColors
          mobileOffset={toasterMobileOffset}
          offset={toasterOffset}
          position="top-center"
          theme="system"
          toastOptions={{
            style: toastStyle,
          }}
        />
        <div id="cookie-consent-root">
          <CookieConsentBanner />
        </div>
      </body>
    </html>
  )
}
