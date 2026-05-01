'use client'

const OWNER_MOBILE_FULL_LAB_SOURCE = 'owner-mobile'
const OWNER_MOBILE_FORCE_DESKTOP_PARAM = 'forceDesktop'

export function buildOwnerMobileFullLabHref(href: string) {
  const [pathname, rawSearch = ''] = href.split('?')
  const params = new URLSearchParams(rawSearch)

  params.set(OWNER_MOBILE_FORCE_DESKTOP_PARAM, '1')
  params.set('from', OWNER_MOBILE_FULL_LAB_SOURCE)

  return `${pathname}?${params.toString()}`
}
