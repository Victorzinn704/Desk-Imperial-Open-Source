import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.demoAccessGrant.deleteMany()
  console.log('Wiped demo grants')
}

main().finally(() => prisma.$disconnect())
