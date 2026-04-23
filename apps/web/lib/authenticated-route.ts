const MOBILE_BREAKPOINT = 960

export function resolveAuthenticatedRoute(role: 'OWNER' | 'STAFF', viewportWidth?: number | null) {
  const isMobile = typeof viewportWidth === 'number' && viewportWidth < MOBILE_BREAKPOINT

  if (isMobile) {
    return role === 'STAFF' ? '/app/staff' : '/app/owner'
  }

  return role === 'OWNER' ? '/design-lab/overview' : '/design-lab/pdv'
}

export function isMobileViewport(viewportWidth?: number | null) {
  return typeof viewportWidth === 'number' && viewportWidth < MOBILE_BREAKPOINT
}
