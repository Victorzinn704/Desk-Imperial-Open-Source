import type { MetadataRoute } from 'next'

const SITE_ORIGIN = 'https://app.deskimperial.online'

const PRIVATE_ROUTE_PREFIXES = [
  '/api/',
  '/app/',
  '/cozinha/',
  '/dashboard/',
  '/dashboard-wireframe/',
  '/design-lab/',
  '/financeiro/',
  '/ia/',
  '/lite/',
  '/redefinir-senha',
  '/sentry-example-page',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: '/',
      disallow: PRIVATE_ROUTE_PREFIXES,
      userAgent: '*',
    },
    sitemap: new URL('/sitemap.xml', SITE_ORIGIN).toString(),
  }
}
