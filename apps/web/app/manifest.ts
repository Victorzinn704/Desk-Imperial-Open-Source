import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Desk Imperial — Operacional',
    short_name: 'Desk Imperial',
    description: 'Sistema operacional móvel para bares e restaurantes',
    start_url: '/app/staff',
    scope: '/app/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    categories: ['business', 'productivity'],
    prefer_related_applications: false,
    launch_handler: {
      client_mode: 'focus-existing',
    },
    icons: [
      {
        src: '/icons/icon-180.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Mesas',
        short_name: 'Mesas',
        description: 'Ver mesas do salão',
        url: '/app/staff?tab=mesas',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Cozinha',
        short_name: 'Cozinha',
        description: 'Pedidos na cozinha',
        url: '/app/staff?tab=cozinha',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    protocol_handlers: [],
    related_applications: [],
  }
}
