const STRONG_SECRET_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/
const STRONG_SECRET_POLICY_MESSAGE = 'A senha precisa ter letra maiúscula, minúscula, número e caractere especial.'
const SECRET_POLICY_MIN_LENGTH = 12
const SECRET_POLICY_MAX_LENGTH = 128

export const STRONG_PASSWORD_REGEX = STRONG_SECRET_POLICY_REGEX
export const STRONG_PASSWORD_MESSAGE = STRONG_SECRET_POLICY_MESSAGE
export const PASSWORD_MIN_LENGTH = SECRET_POLICY_MIN_LENGTH
export const PASSWORD_MAX_LENGTH = SECRET_POLICY_MAX_LENGTH
