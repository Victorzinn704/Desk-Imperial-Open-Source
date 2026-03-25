import { ForbiddenException } from '@nestjs/common'
import type { AuthContext } from '../auth/auth.types'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'

export function assertOperationsRealtimeWorkspaceAccess(
  auth: Pick<AuthContext, 'userId' | 'companyOwnerUserId' | 'role' | 'status'>,
  workspaceOwnerUserId: string,
) {
  if (auth.status !== 'ACTIVE') {
    throw new ForbiddenException('Sessao inativa nao pode acessar o realtime operacional.')
  }

  const resolvedWorkspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)

  if (resolvedWorkspaceOwnerUserId !== workspaceOwnerUserId) {
    throw new ForbiddenException('Acesso negado ao workspace operacional informado.')
  }

  return {
    workspaceOwnerUserId: resolvedWorkspaceOwnerUserId,
    channel: `workspace:${resolvedWorkspaceOwnerUserId}`,
  }
}

export function canAccessOperationsRealtimeWorkspace(
  auth: Pick<AuthContext, 'userId' | 'companyOwnerUserId' | 'role' | 'status'>,
  workspaceOwnerUserId: string,
) {
  try {
    assertOperationsRealtimeWorkspaceAccess(auth, workspaceOwnerUserId)
    return true
  } catch {
    return false
  }
}
