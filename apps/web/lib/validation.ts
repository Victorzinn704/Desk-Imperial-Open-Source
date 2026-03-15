import { z } from 'zod'

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/

export const loginSchema = z.object({
  email: z.string().trim().email('Digite um email valido.'),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
})

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Digite seu nome completo.')
    .max(120, 'O nome esta longo demais.'),
  companyName: z
    .string()
    .trim()
    .max(160, 'O nome da empresa esta longo demais.')
    .optional()
    .or(z.literal('')),
  email: z.string().trim().email('Digite um email valido.'),
  password: z
    .string()
    .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
    .regex(strongPasswordRegex, 'Use letra maiuscula, minuscula, numero e caractere especial.'),
  acceptTerms: z.boolean().refine((value) => value, {
    message: 'Voce precisa aceitar os termos de uso.',
  }),
  acceptPrivacy: z.boolean().refine((value) => value, {
    message: 'Voce precisa aceitar o aviso de privacidade.',
  }),
  analyticsCookies: z.boolean(),
  marketingCookies: z.boolean(),
})

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Digite um nome de produto valido.').max(120, 'O nome ficou longo demais.'),
  category: z.string().trim().min(2, 'Informe uma categoria.').max(80, 'A categoria ficou longa demais.'),
  description: z.string().trim().max(280, 'A descricao ficou longa demais.').optional().or(z.literal('')),
  unitCost: z.coerce.number().min(0, 'O custo nao pode ser negativo.'),
  unitPrice: z.coerce.number().min(0, 'O preco nao pode ser negativo.'),
  stock: z.coerce.number().int('Use um numero inteiro para estoque.').min(0, 'O estoque nao pode ser negativo.'),
})

export const orderSchema = z.object({
  productId: z.string().min(1, 'Selecione um produto.'),
  quantity: z.coerce.number().int('Use um numero inteiro.').min(1, 'A quantidade minima e 1.'),
  customerName: z.string().trim().max(120, 'O nome do cliente ficou longo demais.').optional().or(z.literal('')),
  channel: z.string().trim().max(60, 'O canal ficou longo demais.').optional().or(z.literal('')),
  notes: z.string().trim().max(280, 'A observacao ficou longa demais.').optional().or(z.literal('')),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type ProductFormInputValues = z.input<typeof productSchema>
export type ProductFormValues = z.output<typeof productSchema>
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
    return { score: 2, label: 'Razoavel' }
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
    description: 'Explica como os dados pessoais sao coletados, protegidos e utilizados.',
    required: true,
  },
  {
    key: 'cookie-analytics',
    title: 'Cookies analiticos',
    description: 'Ajudam a medir uso, desempenho e melhorias de navegacao.',
    required: false,
  },
  {
    key: 'cookie-marketing',
    title: 'Cookies de marketing',
    description: 'Permitem comunicacao promocional e personalizacao de campanhas.',
    required: false,
  },
] as const
