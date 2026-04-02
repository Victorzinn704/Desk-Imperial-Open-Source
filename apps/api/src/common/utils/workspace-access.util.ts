import { ForbiddenException } from '@nestjs/common'
import type { AuthContext, WorkspaceScopedAuthContext } from '../../modules/auth/auth.types'

export function resolveWorkspaceOwnerUserId(auth: WorkspaceScopedAuthContext) {
  return auth.workspaceOwnerUserId ?? (auth.role === 'OWNER' ? auth.userId : (auth.companyOwnerUserId ?? auth.userId))
}

export function assertOwnerRole(
  auth: Pick<AuthContext, 'role'>,
  message = 'Apenas o dono da empresa pode executar esta acao.',
) {
  if (auth.role !== 'OWNER') {
    throw new ForbiddenException(message)
  }
}
