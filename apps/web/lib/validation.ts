import { z } from 'zod'
import {
  STRONG_PASSWORD_REGEX,
  STRONG_PASSWORD_MESSAGE,
  EMAIL_CODE_REGEX,
  EMAIL_CODE_MESSAGE,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '@contracts/contracts'

export const currencyCodeSchema = z.enum(['BRL', 'USD', 'EUR'])

export const loginSchema = z.object({
  email: z.string().trim().email('Digite um e-mail válido.'),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Digite um e-mail válido.'),
})

export const verifyEmailSchema = z.object({
  email: z.string().trim().email('Digite um e-mail válido.'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Digite o código de 6 dígitos enviado por e-mail.'),
})

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Digite seu nome completo.')
    .max(120, 'O nome está longo demais.'),
  companyName: z
    .string()
    .trim()
    .max(160, 'O nome da empresa está longo demais.')
    .optional()
    .or(z.literal('')),
  email: z.string().trim().email('Digite um e-mail válido.'),
  password: z
    .string()
    .min(12, 'A senha precisa ter pelo menos 12 caracteres.')
    .max(128, 'A senha está longa demais.')
    .regex(STRONG_PASSWORD_REGEX, 'Use letra maiúscula, minúscula, número e caractere especial.'),
  acceptTerms: z.boolean().refine((value) => value, {
    message: 'Você precisa aceitar os termos de uso.',
  }),
  acceptPrivacy: z.boolean().refine((value) => value, {
    message: 'Você precisa aceitar o aviso de privacidade.',
  }),
})

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email('Digite um e-mail válido.'),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Digite o código de 6 dígitos enviado por e-mail.'),
    password: z
      .string()
      .min(12, 'A senha precisa ter pelo menos 12 caracteres.')
      .max(128, 'A senha está longa demais.')
      .regex(STRONG_PASSWORD_REGEX, 'Use letra maiúscula, minúscula, número e caractere especial.'),
    confirmPassword: z.string().min(12, 'Confirme a nova senha.'),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'As senhas precisam ser iguais.',
      })
    }
  })

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Digite um nome de produto válido.').max(120, 'O nome ficou longo demais.'),
  brand: z.string().trim().max(80, 'A marca ficou longa demais.').optional().or(z.literal('')),
  category: z.string().trim().min(2, 'Informe uma categoria.').max(80, 'A categoria ficou longa demais.'),
  packagingClass: z
    .string()
    .trim()
    .min(2, 'Escolha ou cadastre uma classe de embalagem.')
    .max(120, 'A classe de cadastro ficou longa demais.'),
  measurementUnit: z
    .string()
    .trim()
    .min(1, 'Informe a unidade de medida.')
    .max(24, 'A unidade de medida ficou longa demais.'),
  measurementValue: z.coerce.number().min(0.01, 'A medida por item precisa ser maior que zero.'),
  unitsPerPackage: z
    .coerce
    .number()
    .int('Use um número inteiro para a quantidade por caixa/fardo.')
    .min(1, 'A quantidade por caixa/fardo precisa ser maior que zero.'),
  description: z.string().trim().max(280, 'A descrição ficou longa demais.').optional().or(z.literal('')),
  unitCost: z.coerce.number().min(0, 'O custo não pode ser negativo.'),
  unitPrice: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
  currency: currencyCodeSchema,
  stockPackages: z
    .coerce
    .number()
    .int('Use um número inteiro para caixas/fardos.')
    .min(0, 'A quantidade de caixas/fardos não pode ser negativa.'),
  stockLooseUnits: z
    .coerce
    .number()
    .int('Use um número inteiro para unidades avulsas.')
    .min(0, 'A quantidade de unidades avulsas não pode ser negativa.'),
})
  .superRefine((values, context) => {
    if (values.unitsPerPackage > 1 && values.stockLooseUnits >= values.unitsPerPackage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stockLooseUnits'],
        message: 'As unidades avulsas devem ser menores que a quantidade por caixa/fardo.',
      })
    }
  })
  .transform((values) => ({
    ...values,
    stock: values.stockPackages * values.unitsPerPackage + values.stockLooseUnits,
  }))

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Digite o nome do responsável.')
    .max(120, 'O nome ficou longo demais.'),
  companyName: z
    .string()
    .trim()
    .max(160, 'O nome da empresa ficou longo demais.')
    .optional()
    .or(z.literal('')),
  preferredCurrency: currencyCodeSchema,
})

export const employeeSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(2, 'Informe um ID de funcionário.')
    .max(32, 'O ID do funcionário ficou longo demais.'),
  displayName: z
    .string()
    .trim()
    .min(3, 'Digite o nome do funcionário.')
    .max(120, 'O nome do funcionário ficou longo demais.'),
})

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'Selecione um produto.'),
  quantity: z.coerce.number().int('Use um número inteiro.').min(1, 'A quantidade mínima é 1.'),
  unitPrice: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number().min(0, 'O valor unitário não pode ser negativo.').optional(),
  ),
})

export const orderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1, 'Adicione pelo menos um produto ao pedido.'),
    customerName: z
      .string()
      .trim()
      .min(2, 'Informe o nome do comprador.')
      .max(120, 'O nome do comprador ficou longo demais.'),
    buyerType: z.enum(['PERSON', 'COMPANY']),
    buyerDocument: z.string().trim().min(11, 'Informe um CPF ou CNPJ válido.'),
    buyerDistrict: z.string().trim().max(120, 'O bairro/região ficou longo demais.').optional().or(z.literal('')),
    buyerCity: z.string().trim().min(2, 'Informe a cidade da venda.').max(120, 'A cidade ficou longa demais.'),
    buyerState: z.string().trim().max(120, 'O estado ficou longo demais.').optional().or(z.literal('')),
    buyerCountry: z.string().trim().min(2, 'Informe o país da venda.').max(120, 'O país ficou longo demais.'),
    sellerEmployeeId: z.string().trim().optional().or(z.literal('')),
    currency: currencyCodeSchema,
    channel: z.string().trim().max(60, 'O canal ficou longo demais.').optional().or(z.literal('')),
    notes: z.string().trim().max(280, 'A observação ficou longa demais.').optional().or(z.literal('')),
  })
  .superRefine((values, context) => {
    const document = sanitizeDocument(values.buyerDocument)
    const isPerson = values.buyerType === 'PERSON'
    const validDocument = isPerson ? isValidCpf(document) : isValidCnpj(document)

    if (!validDocument) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['buyerDocument'],
        message: isPerson ? 'Informe um CPF válido.' : 'Informe um CNPJ válido.',
      })
    }
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>
export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
export type ProductFormInputValues = z.input<typeof productSchema>
export type ProductFormValues = z.output<typeof productSchema>
export type ProfileFormValues = z.infer<typeof profileSchema>
export type EmployeeFormValues = z.infer<typeof employeeSchema>
export type OrderFormInputValues = z.input<typeof orderSchema>
export type OrderFormValues = z.output<typeof orderSchema>

export function getPasswordStrength(password: string) {
  let score = 0

  if (password.length >= 8) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z\d]/.test(password)) score += 1

  if (score <= 1) {
    return { score: 1, label: 'Fraca' }
  }

  if (score === 2) {
    return { score: 2, label: 'Razoável' }
  }

  if (score === 3) {
    return { score: 3, label: 'Boa' }
  }

  return { score: 4, label: 'Forte' }
}

export const fallbackConsentDocuments = [
  {
    key: 'terms-of-use',
    title: 'Termos de uso',
    description: 'Estabelecem o uso da plataforma, responsabilidades e regras de acesso.',
    required: true,
  },
  {
    key: 'privacy-policy',
    title: 'Aviso de privacidade',
    description: 'Explica como os dados pessoais são coletados, protegidos e utilizados.',
    required: true,
  },
  {
    key: 'cookie-analytics',
    title: 'Cookies analíticos',
    description: 'Ajudam a medir uso, desempenho e melhorias de navegação.',
    required: false,
  },
  {
    key: 'cookie-marketing',
    title: 'Cookies de marketing',
    description: 'Permitem comunicação promocional e personalização de campanhas.',
    required: false,
  },
] as const

function sanitizeDocument(value: string) {
  return value.replace(/\D/g, '')
}

function isValidCpf(value: string) {
  const digits = sanitizeDocument(value)

  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) {
    return false
  }

  let sum = 0
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index)
  }

  let remainder = (sum * 10) % 11
  if (remainder === 10) {
    remainder = 0
  }

  if (remainder !== Number(digits[9])) {
    return false
  }

  sum = 0
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10) {
    remainder = 0
  }

  return remainder === Number(digits[10])
}

function isValidCnpj(value: string) {
  const digits = sanitizeDocument(value)

  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) {
    return false
  }

  const weightsFirst = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weightsSecond = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  let sum = 0
  for (let index = 0; index < 12; index += 1) {
    sum += Number(digits[index]) * weightsFirst[index]
  }

  let remainder = sum % 11
  const firstDigit = remainder < 2 ? 0 : 11 - remainder
  if (firstDigit !== Number(digits[12])) {
    return false
  }

  sum = 0
  for (let index = 0; index < 13; index += 1) {
    sum += Number(digits[index]) * weightsSecond[index]
  }

  remainder = sum % 11
  const secondDigit = remainder < 2 ? 0 : 11 - remainder

  return secondDigit === Number(digits[13])
}
