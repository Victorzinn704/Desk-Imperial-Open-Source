import type { MetadataRoute } from 'next'

const SITE_ORIGIN = 'https://app.deskimperial.online'

type SitemapFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

type PublicSitemapRoute = {
  changeFrequency: SitemapFrequency
  path: string
  priority: number
}

const PUBLIC_SITEMAP_ROUTES: PublicSitemapRoute[] = [
  { changeFrequency: 'weekly', path: '/', priority: 1 },
  { changeFrequency: 'weekly', path: '/cadastro', priority: 0.9 },
  { changeFrequency: 'monthly', path: '/login', priority: 0.4 },
  { changeFrequency: 'monthly', path: '/recuperar-senha', priority: 0.2 },
  { changeFrequency: 'monthly', path: '/verificar-email', priority: 0.2 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return PUBLIC_SITEMAP_ROUTES.map((route) => toSitemapEntry(route, lastModified))
}

function toSitemapEntry(route: PublicSitemapRoute, lastModified: Date): MetadataRoute.Sitemap[number] {
  return {
    changeFrequency: route.changeFrequency,
    lastModified,
    priority: route.priority,
    url: new URL(route.path, SITE_ORIGIN).toString(),
  }
}
