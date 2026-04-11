import { z } from 'zod'
import {
  PASSWORD_MIN_LENGTH,
  sanitizeDocument,
  STRONG_PASSWORD_REGEX,
  validateCnpj,
  validateCpf,
} from '@contracts/contracts'

export const currencyCodeSchema = z.enum(['BRL', 'USD', 'EUR'])

export const loginSchema = z
  .object({
    loginMode: z.enum(['OWNER', 'STAFF']),
    email: z.string().trim().optional().or(z.literal('')),
    companyEmail: z.string().trim().optional().or(z.literal('')),
    employeeCode: z.string().trim().optional().or(z.literal('')),
    password: z.string(),
  })
  .superRefine((values, context) => {
    const minimumLength = values.loginMode === 'STAFF' ? 6 : 8
    const passwordMessage =
      values.loginMode === 'STAFF'
        ? 'O PIN do funcionário precisa ter pelo menos 6 caracteres.'
        : 'A senha da empresa precisa ter pelo menos 8 caracteres.'

    if (values.password.length < minimumLength) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: passwordMessage,
      })
    }

    if (values.loginMode === 'OWNER') {
      if (!values.email || !z.string().email().safeParse(values.email).success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: 'Digite um e-mail válido.',
        })
      }

      return
    }

    if (!values.companyEmail || !z.string().email().safeParse(values.companyEmail).success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyEmail'],
        message: 'Digite o e-mail principal da empresa.',
      })
    }

    if (!values.employeeCode || values.employeeCode.trim().length < 2) {
      context.addIssue({
        code: 'custom',
        path: ['employeeCode'],
        message: 'Informe o ID do funcionário.',
      })
    }
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

const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{5}-?\d{3}$/, 'Digite um CEP válido.')

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, 'Digite seu nome completo.').max(120, 'O nome está longo demais.'),
    companyName: z.string().trim().max(160, 'O nome da empresa está longo demais.').optional().or(z.literal('')),
    email: z.string().trim().email({ message: 'Digite um e-mail válido.' }),
    companyStreetLine1: z
      .string()
      .trim()
      .min(3, 'Informe a rua ou avenida da empresa.')
      .max(160, 'O endereço ficou longo demais.'),
    companyStreetNumber: z
      .string()
      .trim()
      .min(1, 'Informe o número do endereço.')
      .max(20, 'O número ficou longo demais.'),
    companyAddressComplement: z
      .string()
      .trim()
      .max(120, 'O complemento ficou longo demais.')
      .optional()
      .or(z.literal('')),
    companyDistrict: z
      .string()
      .trim()
      .min(2, 'Informe o bairro ou a região.')
      .max(120, 'O bairro/região ficou longo demais.'),
    companyCity: z.string().trim().min(2, 'Informe a cidade.').max(120, 'A cidade ficou longa demais.'),
    companyState: z.string().trim().min(2, 'Informe o estado.').max(120, 'O estado ficou longo demais.'),
    companyPostalCode: postalCodeSchema,
    companyCountry: z.string().trim().min(2, 'Informe o país.').max(120, 'O país ficou longo demais.'),
    hasEmployees: z.boolean(),
    employeeCount: z.coerce.number().int('Use um número inteiro.').min(0, 'Informe zero ou mais funcionários.'),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
      .max(128, 'A senha está longa demais.')
      .regex(STRONG_PASSWORD_REGEX, 'Use letra maiúscula, minúscula, número e caractere especial.'),
    acceptTerms: z.boolean().refine((value) => value, {
      message: 'Você precisa aceitar os termos de uso.',
    }),
    acceptPrivacy: z.boolean().refine((value) => value, {
      message: 'Você precisa aceitar o aviso de privacidade.',
    }),
  })
  .superRefine((values, context) => {
    if (values.hasEmployees && values.employeeCount < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['employeeCount'],
        message: 'Informe quantos funcionários a empresa possui.',
      })
    }
  })
  .transform((values) => ({
    ...values,
    companyCountry: values.companyCountry.trim() || 'Brasil',
    employeeCount: values.hasEmployees ? values.employeeCount : 0,
  }))

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email('Digite um e-mail válido.'),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Digite o código de 6 dígitos enviado por e-mail.'),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
      .max(128, 'A senha está longa demais.')
      .regex(STRONG_PASSWORD_REGEX, 'Use letra maiúscula, minúscula, número e caractere especial.'),
    confirmPassword: z.string().min(PASSWORD_MIN_LENGTH, 'Confirme a nova senha.'),
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

export const productSchema = z
  .object({
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
    unitsPerPackage: z.coerce
      .number()
      .int('Use um número inteiro para a quantidade por caixa/fardo.')
      .min(1, 'A quantidade por caixa/fardo precisa ser maior que zero.'),
    isCombo: z.boolean().optional().default(false),
    comboDescription: z
      .string()
      .trim()
      .max(420, 'A descrição do combo ficou longa demais.')
      .optional()
      .or(z.literal('')),
    comboItems: z
      .array(
        z.object({
          productId: z.string().trim().min(1, 'Selecione o produto componente.'),
          quantityPackages: z.coerce
            .number()
            .int('Use número inteiro para caixas/fardos no combo.')
            .min(0, 'A quantidade de caixas/fardos não pode ser negativa.'),
          quantityUnits: z.coerce
            .number()
            .int('Use número inteiro para unidades no combo.')
            .min(0, 'A quantidade de unidades não pode ser negativa.'),
        }),
      )
      .optional()
      .default([]),
    description: z.string().trim().max(280, 'A descrição ficou longa demais.').optional().or(z.literal('')),
    unitCost: z.coerce.number().min(0, 'O custo não pode ser negativo.'),
    unitPrice: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
    currency: currencyCodeSchema,
    stockPackages: z.coerce
      .number()
      .int('Use um número inteiro para caixas/fardos.')
      .min(0, 'A quantidade de caixas/fardos não pode ser negativa.'),
    stockLooseUnits: z.coerce
      .number()
      .int('Use um número inteiro para unidades avulsas.')
      .min(0, 'A quantidade de unidades avulsas não pode ser negativa.'),
    requiresKitchen: z.boolean().optional().default(false),
    lowStockThreshold: z.coerce
      .number()
      .int('Use um número inteiro para o limite de estoque baixo.')
      .min(0, 'O limite não pode ser negativo.')
      .nullable()
      .optional(),
  })
  .superRefine((values, context) => {
    if (values.unitsPerPackage > 1 && values.stockLooseUnits >= values.unitsPerPackage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stockLooseUnits'],
        message: 'As unidades avulsas devem ser menores que a quantidade por caixa/fardo.',
      })
    }

    if (values.isCombo) {
      if (!values.comboItems.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['comboItems'],
          message: 'Adicione pelo menos um item para compor o combo.',
        })
      }

      const seenProducts = new Set<string>()
      values.comboItems.forEach((item, index) => {
        if (item.quantityPackages === 0 && item.quantityUnits === 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['comboItems', index, 'quantityUnits'],
            message: 'Informe quantidade em caixa ou unidade para este componente.',
          })
        }

        if (seenProducts.has(item.productId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['comboItems', index, 'productId'],
            message: 'Este produto já foi adicionado no combo.',
          })
        }
        seenProducts.add(item.productId)
      })
    }
  })
  .transform((values) => ({
    ...values,
    stock: values.stockPackages * values.unitsPerPackage + values.stockLooseUnits,
    comboDescription: values.isCombo ? values.comboDescription : '',
    comboItems: values.isCombo ? values.comboItems : [],
  }))

export const profileSchema = z.object({
  fullName: z.string().trim().min(3, 'Digite o nome do responsável.').max(120, 'O nome ficou longo demais.'),
  companyName: z.string().trim().max(160, 'O nome da empresa ficou longo demais.').optional().or(z.literal('')),
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
  temporaryPassword: z.string().regex(/^\d{6}$/, 'O PIN precisa ter exatamente 6 dígitos numéricos.'),
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
    buyerState: z.string().trim().min(2, 'Informe o estado da venda.').max(120, 'O estado ficou longo demais.'),
    buyerCountry: z
      .string()
      .trim()
      .max(120, 'O país ficou longo demais.')
      .optional()
      .or(z.literal(''))
      .transform((v) => (!v || v.trim() === '' ? 'Brasil' : v)),
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
export type RegisterFormInputValues = z.input<typeof registerSchema>
export type RegisterFormValues = z.output<typeof registerSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
export type ProductFormInputValues = z.input<typeof productSchema>
export type ProductFormValues = z.output<typeof productSchema>
export type ProfileFormValues = z.infer<typeof profileSchema>
export type EmployeeFormValues = z.infer<typeof employeeSchema>
export type OrderFormInputValues = z.input<typeof orderSchema>
export type OrderFormValues = z.output<typeof orderSchema>

export function getPasswordStrength(password: string) {
  let score = 0

  if (password.length >= 8) {score += 1}
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {score += 1}
  if (/\d/.test(password)) {score += 1}
  if (/[^A-Za-z\d]/.test(password)) {score += 1}

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

function isValidCpf(value: string) {
  return validateCpf(value)
}

function isValidCnpj(value: string) {
  return validateCnpj(value)
}
