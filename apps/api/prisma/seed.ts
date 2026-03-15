import * as argon2 from 'argon2'
import { OrderStatus, PrismaClient, UserStatus } from '@prisma/client'

const prisma = new PrismaClient()

const consentVersion = process.env.CONSENT_VERSION ?? '2026.03'

const documents = [
  {
    key: 'terms-of-use',
    version: consentVersion,
    title: 'Termos de uso',
    description: 'Documento base para uso da plataforma.',
    kind: 'LEGAL' as const,
    required: true,
  },
  {
    key: 'privacy-policy',
    version: consentVersion,
    title: 'Aviso de privacidade',
    description: 'Documento com as regras de tratamento de dados pessoais.',
    kind: 'LEGAL' as const,
    required: true,
  },
  {
    key: 'cookie-policy',
    version: consentVersion,
    title: 'Politica de cookies',
    description: 'Documento com a politica de cookies necessarios e opcionais.',
    kind: 'COOKIE' as const,
    required: true,
  },
  {
    key: 'cookie-analytics',
    version: consentVersion,
    title: 'Cookies analiticos',
    description: 'Consentimento opcional para analytics.',
    kind: 'COOKIE' as const,
    required: false,
  },
  {
    key: 'cookie-marketing',
    version: consentVersion,
    title: 'Cookies de marketing',
    description: 'Consentimento opcional para marketing.',
    kind: 'COOKIE' as const,
    required: false,
  },
]

async function main() {
  for (const document of documents) {
    await prisma.consentDocument.upsert({
      where: {
        key_version: {
          key: document.key,
          version: document.version,
        },
      },
      update: {
        title: document.title,
        description: document.description,
        kind: document.kind,
        required: document.required,
        active: true,
      },
      create: {
        ...document,
        active: true,
      },
    })
  }

  const email = 'demo@partnerportal.com'
  const passwordHash = await argon2.hash('Demo@123', { type: argon2.argon2id })

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      fullName: 'Conta Demo',
      companyName: 'Operacao Demo',
      status: UserStatus.ACTIVE,
    },
    create: {
      fullName: 'Conta Demo',
      companyName: 'Operacao Demo',
      email,
      passwordHash,
      status: UserStatus.ACTIVE,
    },
  })

  await prisma.cookiePreference.upsert({
    where: { userId: user.id },
    update: {
      analytics: true,
      marketing: false,
    },
    create: {
      userId: user.id,
      analytics: true,
      marketing: false,
    },
  })

  const [terms, privacy] = await Promise.all([
    prisma.consentDocument.findUnique({
      where: {
        key_version: {
          key: 'terms-of-use',
          version: consentVersion,
        },
      },
    }),
    prisma.consentDocument.findUnique({
      where: {
        key_version: {
          key: 'privacy-policy',
          version: consentVersion,
        },
      },
    }),
  ])

  for (const document of [terms, privacy]) {
    if (!document) {
      continue
    }

    await prisma.userConsent.upsert({
      where: {
        userId_documentId: {
          userId: user.id,
          documentId: document.id,
        },
      },
      update: {
        acceptedAt: new Date(),
        revokedAt: null,
      },
      create: {
        userId: user.id,
        documentId: document.id,
      },
    })
  }

  await prisma.product.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name: 'Produto Alpha',
      },
    },
    update: {
      category: 'Bebidas',
      description: 'Produto base para demonstracao de dashboard e margem.',
      unitCost: 18.9,
      unitPrice: 39.9,
      stock: 120,
      active: true,
    },
    create: {
      userId: user.id,
      name: 'Produto Alpha',
      category: 'Bebidas',
      description: 'Produto base para demonstracao de dashboard e margem.',
      unitCost: 18.9,
      unitPrice: 39.9,
      stock: 120,
    },
  })

  await prisma.product.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name: 'Produto Beta',
      },
    },
    update: {
      category: 'Combos',
      description: 'Item para demonstrar estoque, receita e markup.',
      unitCost: 27.5,
      unitPrice: 57.9,
      stock: 64,
      active: true,
    },
    create: {
      userId: user.id,
      name: 'Produto Beta',
      category: 'Combos',
      description: 'Item para demonstrar estoque, receita e markup.',
      unitCost: 27.5,
      unitPrice: 57.9,
      stock: 64,
    },
  })

  const [productAlpha, productBeta] = await Promise.all([
    prisma.product.findUnique({
      where: {
        userId_name: {
          userId: user.id,
          name: 'Produto Alpha',
        },
      },
    }),
    prisma.product.findUnique({
      where: {
        userId_name: {
          userId: user.id,
          name: 'Produto Beta',
        },
      },
    }),
  ])

  if (productAlpha) {
    await prisma.order.upsert({
      where: {
        id: 'seed-order-alpha',
      },
      update: {
        customerName: 'Cliente Portfolio',
        channel: 'Marketplace',
        notes: 'Pedido base para receita do mes atual.',
        status: OrderStatus.COMPLETED,
        totalRevenue: 119.7,
        totalCost: 56.7,
        totalProfit: 63,
        totalItems: 3,
        cancelledAt: null,
      },
      create: {
        id: 'seed-order-alpha',
        userId: user.id,
        customerName: 'Cliente Portfolio',
        channel: 'Marketplace',
        notes: 'Pedido base para receita do mes atual.',
        status: OrderStatus.COMPLETED,
        totalRevenue: 119.7,
        totalCost: 56.7,
        totalProfit: 63,
        totalItems: 3,
        createdAt: new Date(),
        items: {
          create: {
            productId: productAlpha.id,
            productName: productAlpha.name,
            category: productAlpha.category,
            quantity: 3,
            unitCost: 18.9,
            unitPrice: 39.9,
            lineRevenue: 119.7,
            lineCost: 56.7,
            lineProfit: 63,
          },
        },
      },
    })
  }

  if (productBeta) {
    await prisma.order.upsert({
      where: {
        id: 'seed-order-beta-prev-month',
      },
      update: {
        customerName: 'Cliente Mensal',
        channel: 'App',
        notes: 'Pedido do mes anterior para comparativo.',
        status: OrderStatus.COMPLETED,
        totalRevenue: 115.8,
        totalCost: 55,
        totalProfit: 60.8,
        totalItems: 2,
        cancelledAt: null,
      },
      create: {
        id: 'seed-order-beta-prev-month',
        userId: user.id,
        customerName: 'Cliente Mensal',
        channel: 'App',
        notes: 'Pedido do mes anterior para comparativo.',
        status: OrderStatus.COMPLETED,
        totalRevenue: 115.8,
        totalCost: 55,
        totalProfit: 60.8,
        totalItems: 2,
        createdAt: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 12, 16, 30, 0),
        items: {
          create: {
            productId: productBeta.id,
            productName: productBeta.name,
            category: productBeta.category,
            quantity: 2,
            unitCost: 27.5,
            unitPrice: 57.9,
            lineRevenue: 115.8,
            lineCost: 55,
            lineProfit: 60.8,
          },
        },
      },
    })
  }

  console.log('Seed concluido com sucesso.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
