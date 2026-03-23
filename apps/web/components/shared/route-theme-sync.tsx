'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

function resolveRouteGroup(pathname: string) {
  if (
    pathname === '/login' ||
    pathname === '/cadastro' ||
    pathname === '/verificar-email' ||
    pathname === '/recuperar-senha' ||
    pathname === '/redefinir-senha'
  ) {
    return 'auth'
  }

  if (pathname.startsWith('/dashboard')) {
    return 'dashboard'
  }

  return 'public'
}

export function RouteThemeSync() {
  const pathname = usePathname()

  useEffect(() => {
    const routeGroup = resolveRouteGroup(pathname)
    document.body.dataset.routeGroup = routeGroup

    return () => {
      if (document.body.dataset.routeGroup === routeGroup) {
        delete document.body.dataset.routeGroup
      }
    }
  }, [pathname])

  return null
}
