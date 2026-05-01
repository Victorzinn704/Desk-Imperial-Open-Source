import * as argon2 from 'argon2'
import { ComandaStatus, PrismaClient } from '@prisma/client'
import { isKitchenCategory } from '../src/common/utils/is-kitchen-category.util'
import { ensureEmployeeLoginUser } from '../src/modules/auth/auth-login-actor.utils'
import { loadSeedEnv } from './seed-runtime'

function normalizeTableLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^mesa\s*/i, '')
}

loadSeedEnv()

const prisma = new PrismaClient()

async function main() {
  const companyEmail = process.env.DEMO_ACCOUNT_EMAIL ?? 'demo@deskimperial.online'
  const staffPassword = process.env.DEMO_STAFF_PASSWORD ?? '123456'

  const owner = await prisma.user.findUnique({
    where: { email: companyEmail },
  })

  if (!owner) {
    console.log(`Conta demo ${companyEmail} não encontrada.`)
    return
  }

  const [employees, products, mesas, openComandas] = await Promise.all([
    prisma.employee.findMany({
      where: { userId: owner.id },
      orderBy: { employeeCode: 'asc' },
      select: {
        id: true,
        active: true,
        employeeCode: true,
        displayName: true,
        passwordHash: true,
        loginUser: {
          select: {
            id: true,
            passwordHash: true,
          },
        },
      },
    }),
    prisma.product.findMany({
      where: {
        userId: owner.id,
      },
      select: {
        id: true,
        category: true,
        requiresKitchen: true,
      },
    }),
    prisma.mesa.findMany({
      where: {
        companyOwnerId: owner.id,
      },
      select: {
        id: true,
        label: true,
      },
    }),
    prisma.comanda.findMany({
      where: {
        companyOwnerId: owner.id,
        status: {
          in: [ComandaStatus.OPEN, ComandaStatus.IN_PREPARATION, ComandaStatus.READY],
        },
        mesaId: null,
      },
      select: {
        id: true,
        tableLabel: true,
      },
    }),
  ])

  const employeePasswordHash = await argon2.hash(staffPassword, { type: argon2.argon2id })
  const kitchenProductIds = products
    .filter((product) => !product.requiresKitchen && isKitchenCategory(product.category))
    .map((product) => product.id)

  const mesaByNormalizedLabel = new Map<string, Array<{ id: string; label: string }>>()
  for (const mesa of mesas) {
    const key = normalizeTableLabel(mesa.label)
    const matches = mesaByNormalizedLabel.get(key) ?? []
    matches.push(mesa)
    mesaByNormalizedLabel.set(key, matches)
  }

  let mesaLinksRepaired = 0
  let mesaLinksAmbiguous = 0

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: owner.id },
      data: {
        hasEmployees: employees.length > 0,
        employeeCount: employees.length,
      },
    })

    if (employees.length > 0) {
      for (const employee of employees) {
        await transaction.employee.update({
          where: { id: employee.id },
          data: {
            passwordHash: employeePasswordHash,
            active: true,
          },
        })

        await ensureEmployeeLoginUser(transaction, {
          employee: {
            ...employee,
            passwordHash: employeePasswordHash,
          },
          ownerUser: owner,
          fallbackPasswordHash: employeePasswordHash,
        })
      }
    }

    if (kitchenProductIds.length > 0) {
      await transaction.product.updateMany({
        where: {
          id: { in: kitchenProductIds },
        },
        data: {
          requiresKitchen: true,
        },
      })
    }

    for (const comanda of openComandas) {
      const matches = mesaByNormalizedLabel.get(normalizeTableLabel(comanda.tableLabel)) ?? []
      if (matches.length !== 1) {
        mesaLinksAmbiguous += 1
        continue
      }

      const mesa = matches[0]
      await transaction.comanda.update({
        where: { id: comanda.id },
        data: {
          mesaId: mesa.id,
          tableLabel: mesa.label,
        },
      })
      mesaLinksRepaired += 1
    }
  })

  console.log(`Demo repair concluído para ${owner.email}.`)
  console.log(`- Funcionários com senha sincronizada: ${employees.length}`)
  console.log(`- Produtos ajustados para cozinha: ${kitchenProductIds.length}`)
  console.log(`- Metadados de workforce corrigidos: yes`)
  console.log(`- Comandas vinculadas a mesas: ${mesaLinksRepaired}`)
  console.log(`- Comandas sem vínculo resolvido automaticamente: ${mesaLinksAmbiguous}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
