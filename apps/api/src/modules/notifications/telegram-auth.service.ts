import { Injectable } from '@nestjs/common'
import { TelegramAccountStatus, UserStatus } from '@prisma/client'
import { toAuthUser } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import type { PrismaService } from '../../database/prisma.service'
import type { TelegramAdapter } from './infra/telegram/telegram.adapter'

const telegramAuthUserSelect = {
  id: true,
  companyOwnerId: true,
  fullName: true,
  companyName: true,
  companyStreetLine1: true,
  companyStreetNumber: true,
  companyAddressComplement: true,
  companyDistrict: true,
  companyCity: true,
  companyState: true,
  companyPostalCode: true,
  companyCountry: true,
  companyLatitude: true,
  companyLongitude: true,
  hasEmployees: true,
  employeeCount: true,
  role: true,
  email: true,
  emailVerifiedAt: true,
  preferredCurrency: true,
  status: true,
  cookiePreference: {
    select: {
      analytics: true,
      marketing: true,
    },
  },
  employeeAccount: {
    select: {
      id: true,
      employeeCode: true,
      active: true,
    },
  },
} as const

export type TelegramChatAuthResolution =
  | { status: 'unlinked' }
  | { status: 'workspace_disabled'; accountId: string; workspaceOwnerUserId: string }
  | { status: 'user_disabled'; accountId: string; workspaceOwnerUserId: string }
  | { status: 'employee_disabled'; accountId: string; workspaceOwnerUserId: string }
  | {
      status: 'ok'
      accountId: string
      auth: AuthContext
      workspaceOwnerUserId: string
      telegramChatId: bigint
    }

@Injectable()
export class TelegramAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramAdapter: TelegramAdapter,
  ) {}

  async resolveChatAuth(telegramChatId: bigint): Promise<TelegramChatAuthResolution> {
    const account = await this.prisma.telegramAccount.findFirst({
      where: {
        telegramChatId,
        status: TelegramAccountStatus.ACTIVE,
      },
      orderBy: { linkedAt: 'desc' },
      include: {
        user: {
          select: telegramAuthUserSelect,
        },
      },
    })

    if (!account) {
      return { status: 'unlinked' }
    }
    if (!this.telegramAdapter.isWorkspaceEnabled(account.workspaceOwnerUserId)) {
      return {
        status: 'workspace_disabled',
        accountId: account.id,
        workspaceOwnerUserId: account.workspaceOwnerUserId,
      }
    }
    if (account.user.status !== UserStatus.ACTIVE) {
      return {
        status: 'user_disabled',
        accountId: account.id,
        workspaceOwnerUserId: account.workspaceOwnerUserId,
      }
    }
    if (account.user.role === 'STAFF' && !account.user.employeeAccount?.active) {
      return {
        status: 'employee_disabled',
        accountId: account.id,
        workspaceOwnerUserId: account.workspaceOwnerUserId,
      }
    }

    return {
      status: 'ok',
      accountId: account.id,
      telegramChatId: account.telegramChatId,
      workspaceOwnerUserId: account.workspaceOwnerUserId,
      auth: toAuthUser(account.user, {
        sessionId: `telegram:${account.id}`,
        actorUserId: account.user.id,
        analytics: account.user.cookiePreference?.analytics ?? false,
        marketing: account.user.cookiePreference?.marketing ?? false,
        evaluationAccess: null,
        employeeId: account.user.role === 'STAFF' ? (account.user.employeeAccount?.id ?? null) : null,
        employeeCode: account.user.role === 'STAFF' ? (account.user.employeeAccount?.employeeCode ?? null) : null,
      }),
    }
  }

  async touchAccount(accountId: string) {
    await this.prisma.telegramAccount.updateMany({
      where: {
        id: accountId,
        status: TelegramAccountStatus.ACTIVE,
      },
      data: {
        lastActiveAt: new Date(),
      },
    })
  }
}
