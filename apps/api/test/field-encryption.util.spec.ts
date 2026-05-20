import {
  decryptFieldValue,
  encryptFieldValue,
  FieldEncryptionError,
  normalizeEncryptionKey,
} from '../src/common/utils/field-encryption.util'

const ENCRYPTION_KEY = '12345678901234567890123456789012'

describe('field-encryption.util', () => {
  it('criptografa e descriptografa um payload com sucesso', () => {
    const encrypted = encryptFieldValue('segredo-operacional', ENCRYPTION_KEY)

    expect(encrypted.startsWith('enc.v1.')).toBe(true)
    expect(decryptFieldValue(encrypted, ENCRYPTION_KEY)).toBe('segredo-operacional')
  })

  it('suporta AAD para amarrar o payload ao contexto', () => {
    const encrypted = encryptFieldValue('token-sensivel', ENCRYPTION_KEY, 'telegram-link-token')

    expect(decryptFieldValue(encrypted, ENCRYPTION_KEY, 'telegram-link-token')).toBe('token-sensivel')
    expect(() => decryptFieldValue(encrypted, ENCRYPTION_KEY, 'outro-contexto')).toThrow(FieldEncryptionError)
  })

  it('recusa chave com tamanho invalido', () => {
    expect(() => normalizeEncryptionKey('curta')).toThrow(FieldEncryptionError)
  })

  it('recusa payload malformado', () => {
    expect(() => decryptFieldValue('abc', ENCRYPTION_KEY)).toThrow(FieldEncryptionError)
  })

  it('recusa valor vazio na criptografia', () => {
    expect(() => encryptFieldValue('', ENCRYPTION_KEY)).toThrow(FieldEncryptionError)
  })
})
