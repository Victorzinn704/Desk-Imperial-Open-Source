/**
 * Padrões de validação compartilhados entre API e Web
 * Mantém sincronização de regras de negócio em um único lugar
 */

/**
 * Regex para validação de senha forte
 * Requer: letra maiúscula, letra minúscula, número e caractere especial
 *
 * Exemplos válidos:
 * - Strong@Pass123
 * - MyP@ssw0rd
 * - Abc123!@#
 */
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/

/**
 * Mensagem padrão para validação de senha
 */
export const STRONG_PASSWORD_MESSAGE = 'A senha precisa ter letra maiúscula, minúscula, número e caractere especial.'

/**
 * Regex para validação de código de email (6 dígitos)
 */
export const EMAIL_CODE_REGEX = /^\d{6}$/

/**
 * Mensagem padrão para código de email
 */
export const EMAIL_CODE_MESSAGE = 'Digite o código de 6 dígitos enviado por e-mail.'

/**
 * Comprimento mínimo de senha
 */
export const PASSWORD_MIN_LENGTH = 8

/**
 * Comprimento máximo de senha
 */
export const PASSWORD_MAX_LENGTH = 128
