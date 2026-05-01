import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ENCRYPTION_VERSION = 'v1'
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_IV_BYTES = 12
const ENCRYPTION_AUTH_TAG_BYTES = 16
const ENCRYPTION_SEPARATOR = '.'
const ENCRYPTION_PREFIX = `enc${ENCRYPTION_SEPARATOR}${ENCRYPTION_VERSION}`

export class FieldEncryptionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FieldEncryptionError'
  }
}

export function normalizeEncryptionKey(rawKey: string) {
  const normalized = rawKey.trim()

  if (normalized.length !== 32) {
    throw new FieldEncryptionError('ENCRYPTION_KEY deve ter exatamente 32 caracteres para AES-256-GCM.')
  }

  return Buffer.from(normalized, 'utf8')
}

export function encryptFieldValue(rawValue: string, rawKey: string, aad?: string) {
  if (!rawValue) {
    throw new FieldEncryptionError('Nao e possivel criptografar um valor vazio.')
  }

  const key = normalizeEncryptionKey(rawKey)
  const iv = randomBytes(ENCRYPTION_IV_BYTES)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv, {
    authTagLength: ENCRYPTION_AUTH_TAG_BYTES,
  })

  if (aad) {
    cipher.setAAD(Buffer.from(aad, 'utf8'))
  }

  const ciphertext = Buffer.concat([cipher.update(rawValue, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    ENCRYPTION_PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(ENCRYPTION_SEPARATOR)
}

export function decryptFieldValue(encryptedValue: string, rawKey: string, aad?: string) {
  const segments = encryptedValue.split(ENCRYPTION_SEPARATOR)

  if (segments.length !== 5 || `${segments[0]}${ENCRYPTION_SEPARATOR}${segments[1]}` !== ENCRYPTION_PREFIX) {
    throw new FieldEncryptionError('Payload criptografado invalido.')
  }

  const ivSegment = segments[2]
  const tagSegment = segments[3]
  const dataSegment = segments[4]

  if (!ivSegment || !tagSegment || !dataSegment) {
    throw new FieldEncryptionError('Payload criptografado incompleto.')
  }

  const key = normalizeEncryptionKey(rawKey)
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, Buffer.from(ivSegment, 'base64url'), {
    authTagLength: ENCRYPTION_AUTH_TAG_BYTES,
  })

  if (aad) {
    decipher.setAAD(Buffer.from(aad, 'utf8'))
  }

  decipher.setAuthTag(Buffer.from(tagSegment, 'base64url'))

  try {
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(dataSegment, 'base64url')),
      decipher.final(),
    ])
    return plaintext.toString('utf8')
  } catch {
    throw new FieldEncryptionError('Nao foi possivel descriptografar o payload.')
  }
}
