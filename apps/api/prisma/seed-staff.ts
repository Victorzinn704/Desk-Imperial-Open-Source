import { PrismaClient, UserRole, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  const companyEmail = 'demo@deskimperial.online'

  const owner = await prisma.user.findUnique({
    where: { email: companyEmail },
  })

  // Achando o VD-001
  const employee = await prisma.employee.findFirst({
    where: { userId: owner.id, employeeCode: 'VD-001' },
  })

  if (!employee) {
    console.log('VD-001 não encontrado.')
    return
  }

  const staffEmail = 'staff.vd001@deskimperial.online'
  const passwordHash = await argon2.hash('123456', { type: argon2.argon2id })

  const staffUser = await prisma.user.upsert({
    where: { email: staffEmail },
    update: {
      passwordHash,
      companyOwnerId: owner.id,
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
    },
    create: {
      fullName: employee.displayName,
      email: staffEmail,
      passwordHash,
      companyOwnerId: owner.id,
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  })

  // Linking employee to the loginUser
  await prisma.employee.update({
    where: { id: employee.id },
    data: { loginUserId: staffUser.id },
  })

  console.log('Demo Staff User Created/Updated successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
