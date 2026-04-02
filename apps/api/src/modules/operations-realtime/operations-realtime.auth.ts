import { ForbiddenException } from '@nestjs/common'
import type { ActiveWorkspaceScopedAuthContext } from '../auth/auth.types'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { buildWorkspaceChannel } from './operations-realtime.types'

export function resolveOperationsRealtimeWorkspace(auth: ActiveWorkspaceScopedAuthContext) {
  if (auth.status !== 'ACTIVE') {
    throw new ForbiddenException('Sessao inativa nao pode acessar o realtime operacional.')
  }

  const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)

  return {
    workspaceOwnerUserId,
    channel: buildWorkspaceChannel(workspaceOwnerUserId),
  }
}
