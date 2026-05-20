const MOBILE_BREAKPOINT = 960
const COARSE_POINTER_BREAKPOINT = 1180

export function resolveAuthenticatedRoute(role: 'OWNER' | 'STAFF', viewportWidth?: number | null) {
  const isMobile = isMobileViewport(viewportWidth)

  if (isMobile) {
    return role === 'STAFF' ? '/app/staff' : '/app/owner'
  }

  return role === 'OWNER' ? '/design-lab/overview' : '/design-lab/pdv'
}

export function isMobileViewport(viewportWidth?: number | null) {
  if (hasStandaloneDisplay()) {
    return true
  }

  if (hasMobileUserAgent()) {
    return true
  }

  if (typeof viewportWidth === 'number' && viewportWidth < MOBILE_BREAKPOINT) {
    return true
  }

  return typeof viewportWidth === 'number' && viewportWidth < COARSE_POINTER_BREAKPOINT && hasCoarsePointer()
}

function hasStandaloneDisplay() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

function hasMobileUserAgent() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const userAgent = navigator.userAgent.toLowerCase()
  return /android|iphone|ipod|ipad|mobile|silk|kindle|opera mini|webos/.test(userAgent)
}

function hasCoarsePointer() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(pointer: coarse)').matches
}
