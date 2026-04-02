import type { ConsentKind } from '@prisma/client'

const CONSENT_KIND = {
  LEGAL: 'LEGAL' as ConsentKind,
  COOKIE: 'COOKIE' as ConsentKind,
} as const

export const LEGAL_DOCUMENT_KEYS = {
  termsOfUse: 'terms-of-use',
  privacyPolicy: 'privacy-policy',
  cookiePolicy: 'cookie-policy',
} as const

export const COOKIE_DOCUMENT_KEYS = {
  analytics: 'cookie-analytics',
  marketing: 'cookie-marketing',
} as const

export const DEFAULT_CONSENT_DOCUMENTS = [
  {
    key: LEGAL_DOCUMENT_KEYS.termsOfUse,
    title: 'Termos de uso',
    description: 'Regras de uso da plataforma e responsabilidades do usuario.',
    kind: CONSENT_KIND.LEGAL,
    required: true,
  },
  {
    key: LEGAL_DOCUMENT_KEYS.privacyPolicy,
    title: 'Aviso de privacidade',
    description: 'Como os dados pessoais sao coletados, usados e protegidos.',
    kind: CONSENT_KIND.LEGAL,
    required: true,
  },
  {
    key: LEGAL_DOCUMENT_KEYS.cookiePolicy,
    title: 'Politica de cookies',
    description: 'Explica os cookies necessarios, analiticos e de marketing da plataforma.',
    kind: CONSENT_KIND.COOKIE,
    required: true,
  },
  {
    key: COOKIE_DOCUMENT_KEYS.analytics,
    title: 'Cookies analiticos',
    description: 'Preferencia opcional para mensuracao de navegacao e produto.',
    kind: CONSENT_KIND.COOKIE,
    required: false,
  },
  {
    key: COOKIE_DOCUMENT_KEYS.marketing,
    title: 'Cookies de marketing',
    description: 'Preferencia opcional para personalizacao de campanhas e comunicacao.',
    kind: CONSENT_KIND.COOKIE,
    required: false,
  },
] as const
