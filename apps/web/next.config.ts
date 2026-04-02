import type { NextConfig } from 'next'

const localApiOrigin = 'http://localhost:4000'
const faroCollectorOrigin = resolveCollectorOrigin(process.env.NEXT_PUBLIC_FARO_COLLECTOR_URL)
const observabilityConnectOrigins = [faroCollectorOrigin].filter(Boolean).join(' ')

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://*.basemaps.cartocdn.com",
      `connect-src 'self' ${localApiOrigin} ws://localhost:4000 https://api.deskimperial.online wss://api.deskimperial.online https://app.deskimperial.online https://*.basemaps.cartocdn.com ${observabilityConnectOrigins}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    // Otimização mobile: formatos modernos e qualidade balanceada
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  // Otimização de bundle para mobile
  experimental: {
    useLightningcss: false,
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      'date-fns',
      '@hello-pangea/dnd',
      'react-big-calendar',
      'zod',
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig

function resolveCollectorOrigin(value: string | undefined) {
  if (!value?.trim()) {
    return ''
  }

  try {
    const parsed = new URL(value)
    const productionMode = process.env.NODE_ENV === 'production'
    const allowInsecureCollector = process.env.NEXT_PUBLIC_FARO_ALLOW_INSECURE_COLLECTOR === 'true'
    const localCollector = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)

    if (productionMode && parsed.protocol !== 'https:') {
      return ''
    }

    if (!productionMode && parsed.protocol !== 'https:' && !localCollector && !allowInsecureCollector) {
      return ''
    }

    return parsed.origin
  } catch {
    return ''
  }
}
