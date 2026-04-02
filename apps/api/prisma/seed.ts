import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import * as argon2 from 'argon2'
import { BuyerType, OrderStatus, PrismaClient, UserStatus } from '@prisma/client'
import { isKitchenCategory } from '../src/common/utils/is-kitchen-category.util'

function loadSeedEnv() {
  if (typeof process.loadEnvFile !== 'function') {
    return
  }

  const candidatePaths = [
    resolve(process.cwd(), '.env'),
    resolve(__dirname, '..', '.env'),
    resolve(__dirname, '..', '..', '..', '.env'),
  ]

  for (const envPath of candidatePaths) {
    if (existsSync(envPath)) {
      process.loadEnvFile(envPath)
    }
  }
}

loadSeedEnv()

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

// Produtos do Bar do Pedrão
const barProducts = [
  // Cervejas Litrão
  { name: 'Brahma Litrão', category: 'Cervejas', brand: 'Brahma', cost: 10.0, price: 12.0, type: 'Litrão' },
  { name: 'Antarctica Litrão', category: 'Cervejas', brand: 'Antarctica', cost: 9.2, price: 11.0, type: 'Litrão' },

  // Cervejas Latão
  { name: 'Brahma Latão', category: 'Cervejas', brand: 'Brahma', cost: 5.0, price: 6.0, type: 'Latão' },
  { name: 'Antarctica Latão', category: 'Cervejas', brand: 'Antarctica', cost: 4.6, price: 5.5, type: 'Latão' },

  // Cervejas Cracudinha (350ml)
  { name: 'Brahma 350ml', category: 'Cervejas', brand: 'Brahma', cost: 2.8, price: 4.0, type: 'Cracudinha' },
  { name: 'Antarctica 350ml', category: 'Cervejas', brand: 'Antarctica', cost: 2.5, price: 3.5, type: 'Cracudinha' },
  { name: 'Corona 350ml', category: 'Cervejas', brand: 'Corona', cost: 5.2, price: 8.0, type: 'Premium' },
  { name: 'Heineken 350ml', category: 'Cervejas', brand: 'Heineken', cost: 4.9, price: 7.5, type: 'Premium' },
  { name: 'Spaten 350ml', category: 'Cervejas', brand: 'Spaten', cost: 4.5, price: 7.0, type: 'Premium' },
  { name: 'Stella Artois 350ml', category: 'Cervejas', brand: 'Stella Artois', cost: 4.9, price: 7.5, type: 'Premium' },
  { name: 'Budweiser 350ml', category: 'Cervejas', brand: 'Budweiser', cost: 4.2, price: 6.5, type: 'Premium' },

  // Destilados
  { name: 'Whisky Dose', category: 'Destilados', brand: 'Variados', cost: 8.5, price: 15.0, type: 'Dose' },
  { name: 'Vodka Dose', category: 'Destilados', brand: 'Variados', cost: 6.8, price: 12.0, type: 'Dose' },
  { name: 'Gin Dose', category: 'Destilados', brand: 'Variados', cost: 8.0, price: 14.0, type: 'Dose' },
  { name: '51 Dose', category: 'Destilados', brand: '51', cost: 2.8, price: 5.0, type: 'Dose' },
  { name: 'Deher Garrafa', category: 'Destilados', brand: 'Deher', cost: 14.0, price: 25.0, type: 'Garrafa' },

  // Outros
  { name: 'Água Mineral', category: 'Outros', brand: 'Variadas', cost: 1.5, price: 3.0, type: 'Bebida' },
  { name: 'Guaraná Lata', category: 'Outros', brand: 'Variadas', cost: 2.8, price: 5.0, type: 'Bebida' },
  { name: 'Coca-Cola Lata', category: 'Outros', brand: 'Coca', cost: 3.0, price: 5.5, type: 'Bebida' },
  { name: 'Guaravita', category: 'Outros', brand: 'Guaravita', cost: 1.2, price: 2.5, type: 'Bebida' },
]

// Vendedores
const vendedores = ['Ana Maria', 'Pedro', 'Lohana', 'João Victor']

type SeedProduct = (typeof barProducts)[number]
type SeedEmployee = {
  id: string
  employeeCode: string
  displayName: string
}

type GeneratedOrder = {
  userId: string
  employee: SeedEmployee
  products: Array<{
    product: SeedProduct
    quantity: number
    revenue: number
    cost: number
  }>
  totalRevenue: number
  totalCost: number
  totalProfit: number
  createdAt: Date
  isEventHour: boolean
}

async function generateRandomOrders(
  userId: string,
  employees: SeedEmployee[],
  products: SeedProduct[],
  days: number = 180,
) {
  const orders: GeneratedOrder[] = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(now)
    currentDate.setDate(currentDate.getDate() - i)
    const dayOfWeek = currentDate.getDay()

    // Determinar quantidade de vendas por dia
    let ordersPerDay = 0
    let isEventHour = false

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Fim de semana
      if (Math.random() > 0.5) {
        // Possível evento
        isEventHour = true
        ordersPerDay = Math.floor(Math.random() * 8) + 6 // 6-14 vendas em evento
      } else {
        // Dia normal até 16h
        ordersPerDay = Math.floor(Math.random() * 3) + 1 // 1-3 vendas
      }
    } else if (dayOfWeek === 5) {
      // Sexta-feira (pode ter evento à noite)
      if (Math.random() > 0.6) {
        isEventHour = true
        ordersPerDay = Math.floor(Math.random() * 10) + 8 // 8-18 vendas em evento
      } else {
        ordersPerDay = Math.floor(Math.random() * 2) + 1
      }
    } else {
      // Segunda a quinta
      ordersPerDay = Math.floor(Math.random() * 2) + 1 // 1-2 vendas
    }

    for (let j = 0; j < ordersPerDay; j++) {
      const employee = employees[Math.floor(Math.random() * employees.length)]
      const numProducts = Math.floor(Math.random() * 3) + 1 // 1-3 produtos por pedido
      const selectedProducts = []
      let totalRevenue = 0
      let totalCost = 0

      for (let k = 0; k < numProducts; k++) {
        const product = products[Math.floor(Math.random() * products.length)]
        const quantity = Math.floor(Math.random() * 5) + 1 // 1-5 unidades
        selectedProducts.push({
          product,
          quantity,
          revenue: product.price * quantity,
          cost: product.cost * quantity,
        })
        totalRevenue += product.price * quantity
        totalCost += product.cost * quantity
      }

      const orderDate = new Date(currentDate)
      if (isEventHour) {
        orderDate.setHours(16 + Math.floor(Math.random() * 8))
      } else {
        orderDate.setHours(Math.floor(Math.random() * 15) + 9) // 9h-23h
      }

      orders.push({
        userId,
        employee,
        products: selectedProducts,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalProfit: Math.round((totalRevenue - totalCost) * 100) / 100,
        createdAt: orderDate,
        isEventHour,
      })
    }
  }

  return orders
}

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

  const email = 'demo@deskimperial.online'
  const passwordHash = await argon2.hash('Demo@123', { type: argon2.argon2id })

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      fullName: 'Bar do Pedrão',
      companyName: 'Bar do Pedrão',
      hasEmployees: true,
      employeeCount: vendedores.length,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    create: {
      fullName: 'Bar do Pedrão',
      companyName: 'Bar do Pedrão',
      hasEmployees: true,
      employeeCount: vendedores.length,
      email,
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
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

  // Criar vendedores
  const employees = []
  for (let i = 0; i < vendedores.length; i++) {
    const emp = await prisma.employee.upsert({
      where: {
        userId_employeeCode: {
          userId: user.id,
          employeeCode: `VD-${String(i + 1).padStart(3, '0')}`,
        },
      },
      update: {
        displayName: vendedores[i],
        active: true,
      },
      create: {
        userId: user.id,
        employeeCode: `VD-${String(i + 1).padStart(3, '0')}`,
        displayName: vendedores[i],
        active: true,
      },
    })
    employees.push(emp)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hasEmployees: employees.length > 0,
      employeeCount: employees.length,
    },
  })

  // Criar produtos do Bar do Pedrão
  const createdProducts = []
  for (const product of barProducts) {
    const requiresKitchen = isKitchenCategory(product.category)
    const created = await prisma.product.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name: product.name,
        },
      },
      update: {
        category: product.category,
        brand: product.brand,
        unitCost: product.cost,
        unitPrice: product.price,
        stock: Math.floor(Math.random() * 50) + 20,
        requiresKitchen,
        active: true,
      },
      create: {
        userId: user.id,
        name: product.name,
        category: product.category,
        brand: product.brand,
        unitCost: product.cost,
        unitPrice: product.price,
        stock: Math.floor(Math.random() * 50) + 20,
        requiresKitchen,
        active: true,
      },
    })
    createdProducts.push(created)
  }

  // Gerar pedidos aleatórios realistas
  const generatedOrders = await generateRandomOrders(user.id, employees, barProducts, 180)

  // Criar pedidos no banco
  let ordersCreated = 0
  for (let i = 0; i < Math.min(generatedOrders.length, 80); i++) {
    const orderData = generatedOrders[i]

    const orderItems = orderData.products.map((item) => {
      const product = createdProducts.find((candidate) => candidate.name === item.product.name)
      return {
        productId: product?.id || createdProducts[0].id,
        productName: item.product.name,
        category: item.product.category,
        quantity: item.quantity,
        unitPrice: item.product.price,
        unitCost: item.product.cost,
        lineRevenue: item.revenue,
        lineCost: item.cost,
        lineProfit: item.revenue - item.cost,
      }
    })

    try {
      await prisma.order.create({
        data: {
          userId: user.id,
          customerName: `Cliente ${i + 1}`,
          buyerType: Math.random() > 0.7 ? BuyerType.COMPANY : BuyerType.PERSON,
          employeeId: orderData.employee.id,
          sellerCode: orderData.employee.employeeCode,
          sellerName: orderData.employee.displayName,
          channel: ['Balcão', 'Evento', 'Entrega'][Math.floor(Math.random() * 3)],
          status: OrderStatus.COMPLETED,
          totalRevenue: orderData.totalRevenue,
          totalCost: orderData.totalCost,
          totalProfit: orderData.totalProfit,
          totalItems: orderData.products.length,
          createdAt: orderData.createdAt,
          items: {
            create: orderItems,
          },
        },
      })
      ordersCreated++
    } catch {
      // Ignorar erros de criação individual
    }
  }

  // Registrar consentimentos
  const terms = await prisma.consentDocument.findUnique({
    where: {
      key_version: {
        key: 'terms-of-use',
        version: consentVersion,
      },
    },
  })

  if (terms) {
    await prisma.userConsent.upsert({
      where: {
        userId_documentId: {
          userId: user.id,
          documentId: terms.id,
        },
      },
      update: {
        acceptedAt: new Date(),
        revokedAt: null,
      },
      create: {
        userId: user.id,
        documentId: terms.id,
      },
    })
  }

  console.log(`✅ Seed concluído com sucesso!`)
  console.log(`   📧 Email: ${user.email}`)
  console.log(`   🍺 Estabelecimento: ${user.companyName}`)
  console.log(`   👥 Vendedores: ${employees.length}`)
  console.log(`   🍻 Produtos: ${createdProducts.length}`)
  console.log(`   📝 Pedidos: ${ordersCreated} (últimos ~6 meses)`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
