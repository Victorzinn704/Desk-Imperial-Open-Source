// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type QzTrayModule = typeof import('qz-tray')

const QZ_CERTIFICATE_ENDPOINT = '/api/printing/qz/certificate'
const QZ_SIGNATURE_ENDPOINT = '/api/printing/qz/sign'

export function configureQzSecurity(qz: QzTrayModule) {
  qz.security.setCertificatePromise((resolve) => {
    void resolveQzCertificate().then(resolve)
  })
  qz.security.setSignaturePromise((toSign) => (resolve) => {
    void signQzPayload(toSign).then(resolve)
  })
  qz.security.setSignatureAlgorithm('SHA256')
}

async function resolveQzCertificate() {
  const response = await fetch(QZ_CERTIFICATE_ENDPOINT, {
    cache: 'no-store',
    credentials: 'same-origin',
  }).catch(() => null)

  if (!response?.ok) {
    return null
  }

  return response.status === 204 ? null : response.text()
}

async function signQzPayload(toSign: string) {
  const response = await fetch(QZ_SIGNATURE_ENDPOINT, {
    body: JSON.stringify({ toSign }),
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  }).catch(() => null)

  if (!response?.ok || response.status === 204) {
    return ''
  }

  const payload = (await response.json().catch(() => null)) as { signature?: string } | null
  return payload?.signature ?? ''
}
