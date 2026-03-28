import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  const companyEmail = 'demo@deskimperial.online'

  const owner = await prisma.user.findUnique({
    where: { email: companyEmail },
  })

  if (!owner) {
    console.log('Owner demo@deskimperial.online não encontrado.')
    return
  }

  // Achando o VD-001
  const employee = await prisma.employee.findFirst({
    where: { userId: owner.id, employeeCode: 'VD-001' },
  })

  if (!employee) {
    console.log('VD-001 não encontrado.')
    return
  }

  const passwordHash = await argon2.hash('123456', { type: argon2.argon2id })

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      passwordHash,
      loginUserId: null,
    },
  })
  console.log('Demo staff credentials synced directly on Employee.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
