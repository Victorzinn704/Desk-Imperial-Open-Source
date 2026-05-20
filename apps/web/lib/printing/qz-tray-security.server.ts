import { createDecipheriv, createHash, createHmac, createSign, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const SIGNATURE_ALGORITHM = 'RSA-SHA256'
const ENCRYPTED_PRIVATE_KEY_ALGORITHM = 'aes-256-cbc+hmac-sha256'
const ENCRYPTED_PRIVATE_KEY_AAD = 'qz-tray-private-key:v1'

type QzSecurityMaterial = {
  certificatePath: string
  certificateSha256?: string
  encryptedPrivateKeyPath?: string
  privateKeyEncryptionKey?: string
  privateKeyPassphrase?: string
  privateKeyPath?: string
  privateKeySha256?: string
}

type EncryptedPrivateKeyPayload = {
  algorithm: string
  ciphertext: string
  hmac: string
  iv: string
  version: 1
}

export function resolveQzSecurityMaterial(): QzSecurityMaterial | null {
  const material = readQzSecurityEnv()
  return hasQzSigningMaterial(material) ? material : null
}

function readQzSecurityEnv(): QzSecurityMaterial {
  const certificatePath = process.env.QZ_TRAY_CERTIFICATE_PATH?.trim()
  return {
    certificateSha256: process.env.QZ_TRAY_CERTIFICATE_SHA256?.trim() || undefined,
    certificatePath: certificatePath ?? '',
    encryptedPrivateKeyPath: process.env.QZ_TRAY_PRIVATE_KEY_ENCRYPTED_PATH?.trim() || undefined,
    privateKeyEncryptionKey: process.env.QZ_TRAY_PRIVATE_KEY_ENCRYPTION_KEY?.trim() || undefined,
    privateKeyPassphrase: process.env.QZ_TRAY_PRIVATE_KEY_PASSPHRASE?.trim() || undefined,
    privateKeyPath: process.env.QZ_TRAY_PRIVATE_KEY_PATH?.trim() || undefined,
    privateKeySha256: process.env.QZ_TRAY_PRIVATE_KEY_SHA256?.trim() || undefined,
  }
}

function hasQzSigningMaterial(material: QzSecurityMaterial) {
  if (!hasText(material.certificatePath)) {
    return false
  }

  return hasPrivateKeyMaterial(material)
}

function hasPrivateKeyMaterial(material: QzSecurityMaterial) {
  return [hasText(material.privateKeyPath), hasEncryptedPrivateKey(material)].some(Boolean)
}

function hasEncryptedPrivateKey(material: QzSecurityMaterial) {
  return hasText(material.encryptedPrivateKeyPath) && hasText(material.privateKeyEncryptionKey)
}

export async function readQzCertificate() {
  const material = resolveQzSecurityMaterial()
  if (!material) {
    return null
  }

  const certificate = await readFile(material.certificatePath)
  assertSha256Digest('Certificado QZ Tray', certificate, material.certificateSha256)
  return certificate.toString('utf8')
}

export async function signQzPayload(payload: string) {
  const material = resolveQzSecurityMaterial()
  if (!material) {
    return null
  }

  const privateKey = await readQzPrivateKey(material)
  const signer = createSign(SIGNATURE_ALGORITHM)
  signer.update(payload, 'utf8')
  signer.end()

  return signer.sign(
    {
      key: privateKey,
      passphrase: material.privateKeyPassphrase,
    },
    'base64',
  )
}

async function readQzPrivateKey(material: QzSecurityMaterial) {
  const privateKey = material.encryptedPrivateKeyPath
    ? await decryptQzPrivateKey(material)
    : await readPlainQzPrivateKey(material)

  assertSha256Digest('Private key QZ Tray', Buffer.from(privateKey, 'utf8'), material.privateKeySha256)
  return privateKey
}

async function readPlainQzPrivateKey(material: QzSecurityMaterial) {
  if (!material.privateKeyPath) {
    throw new Error('Private key QZ Tray nao configurada.')
  }

  return readFile(material.privateKeyPath, 'utf8')
}

async function decryptQzPrivateKey(material: QzSecurityMaterial) {
  const config = requireEncryptedPrivateKeyConfig(material)
  const payload = parseEncryptedPrivateKeyPayload(await readFile(config.path, 'utf8'))
  const keys = parseEncryptedPrivateKeyMasterKey(config.encryptionKey)
  const iv = Buffer.from(payload.iv, 'base64')
  const ciphertext = Buffer.from(payload.ciphertext, 'base64')

  assertEncryptedPrivateKeyMac(keys.macKey, iv, ciphertext, payload.hmac)
  const decipher = createDecipheriv('aes-256-cbc', keys.encryptionKey, iv)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

function requireEncryptedPrivateKeyConfig(material: QzSecurityMaterial) {
  if (!hasEncryptedPrivateKey(material)) {
    throw new Error('Private key QZ Tray criptografada incompleta.')
  }

  return {
    encryptionKey: material.privateKeyEncryptionKey as string,
    path: material.encryptedPrivateKeyPath as string,
  }
}

function parseEncryptedPrivateKeyMasterKey(rawKey: string) {
  const masterKey = Buffer.from(rawKey, 'base64')
  if (masterKey.length !== 64) {
    throw new Error('Chave de criptografia da private key QZ Tray invalida.')
  }

  return {
    encryptionKey: masterKey.subarray(0, 32),
    macKey: masterKey.subarray(32),
  }
}

function assertEncryptedPrivateKeyMac(macKey: Buffer, iv: Buffer, ciphertext: Buffer, expectedMac: string) {
  const macInput = Buffer.concat([Buffer.from(ENCRYPTED_PRIVATE_KEY_AAD, 'utf8'), iv, ciphertext])
  const actualMac = createHmac('sha256', macKey).update(macInput).digest()
  if (!sameBytes(actualMac, Buffer.from(expectedMac, 'base64'))) {
    throw new Error('Assinatura da private key QZ Tray criptografada nao confere.')
  }
}

function parseEncryptedPrivateKeyPayload(rawPayload: string): EncryptedPrivateKeyPayload {
  const payload = JSON.parse(rawPayload) as Partial<EncryptedPrivateKeyPayload>
  if (!isEncryptedPrivateKeyPayload(payload)) {
    throw new Error('Payload criptografado da private key QZ Tray invalido.')
  }

  return payload as EncryptedPrivateKeyPayload
}

function isEncryptedPrivateKeyPayload(payload: Partial<EncryptedPrivateKeyPayload>) {
  return [
    payload.version === 1,
    payload.algorithm === ENCRYPTED_PRIVATE_KEY_ALGORITHM,
    hasText(payload.iv),
    hasText(payload.ciphertext),
    hasText(payload.hmac),
  ].every(Boolean)
}

function hasText(value: unknown) {
  return typeof value === 'string' && value.length > 0
}

function assertSha256Digest(label: string, content: Buffer, expectedDigest?: string) {
  if (!expectedDigest) {
    return
  }

  const normalizedDigest = expectedDigest.toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(normalizedDigest)) {
    throw new Error(`${label}: SHA-256 configurado invalido.`)
  }

  const actualDigest = createHash('sha256').update(content).digest()
  const expectedBuffer = Buffer.from(normalizedDigest, 'hex')
  if (!sameBytes(actualDigest, expectedBuffer)) {
    throw new Error(`${label}: SHA-256 nao confere.`)
  }
}

function sameBytes(left: Buffer, right: Buffer) {
  return left.length === right.length && timingSafeEqual(left, right)
}
