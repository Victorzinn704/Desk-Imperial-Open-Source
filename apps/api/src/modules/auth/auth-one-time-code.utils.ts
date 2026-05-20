import { OneTimeCodePurpose } from '@prisma/client'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { PrismaService } from '../../database/prisma.service'
import { generateNumericCode, hashToken } from './auth-shared.util'

export type IssuedOneTimeCode = {
  code: string
  recordId: string
  expiresAt: Date
}

export async function issueOneTimeCode(
  prisma: PrismaService,
  params: {
    userId: string
    email: string
    purpose: OneTimeCodePurpose
    ttlMinutes: number
    context: RequestContext
  },
): Promise<IssuedOneTimeCode> {
  const code = generateNumericCode()
  const expiresAt = new Date(Date.now() + params.ttlMinutes * 60 * 1000)

  await prisma.oneTimeCode.updateMany({
    where: { userId: params.userId, purpose: params.purpose, usedAt: null },
    data: { usedAt: new Date() },
  })

  const record = await prisma.oneTimeCode.create({
    data: {
      userId: params.userId,
      email: params.email,
      purpose: params.purpose,
      codeHash: hashToken(code),
      expiresAt,
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    },
  })

  return { recordId: record.id, code, expiresAt }
}
