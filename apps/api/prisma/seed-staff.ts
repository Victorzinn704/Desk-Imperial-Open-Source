import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'
import { ensureEmployeeLoginUser } from '../src/modules/auth/auth-login-actor.utils'
import { loadSeedEnv } from './seed-runtime'

loadSeedEnv()

const prisma = new PrismaClient()

async function main() {
  const companyEmail = process.env.DEMO_ACCOUNT_EMAIL ?? 'demo@deskimperial.online'

  const owner = await prisma.user.findUnique({
    where: { email: companyEmail },
  })

  if (!owner) {
    console.log(`Owner ${companyEmail} não encontrado.`)
    return
  }

  const employees = await prisma.employee.findMany({
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
  })

  if (employees.length === 0) {
    console.log(`Nenhum funcionário encontrado para ${companyEmail}.`)
    return
  }

  const passwordHash = await argon2.hash(process.env.DEMO_STAFF_PASSWORD ?? '123456', { type: argon2.argon2id })
  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: owner.id },
      data: {
        hasEmployees: employees.length > 0,
        employeeCount: employees.length,
      },
    })

    for (const employee of employees) {
      await transaction.employee.update({
        where: { id: employee.id },
        data: {
          passwordHash,
          active: true,
        },
      })
      await ensureEmployeeLoginUser(transaction, {
        employee: {
          ...employee,
          passwordHash,
        },
        ownerUser: owner,
        fallbackPasswordHash: passwordHash,
      })
    }
  })

  console.log(`Demo staff credentials synced for ${employees.length} employee(s).`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
