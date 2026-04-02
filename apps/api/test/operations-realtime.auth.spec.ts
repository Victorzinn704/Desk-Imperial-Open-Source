import { ForbiddenException } from '@nestjs/common'
import { resolveOperationsRealtimeWorkspace } from '../src/modules/operations-realtime/operations-realtime.auth'

describe('operations-realtime.auth', () => {
  it('resolve workspace para owner ativo', () => {
    const result = resolveOperationsRealtimeWorkspace({
      userId: 'owner-1',
      role: 'OWNER',
      status: 'ACTIVE',
      workspaceOwnerUserId: undefined,
      companyOwnerUserId: 'company-1',
    } as any)

    expect(result).toEqual({
      workspaceOwnerUserId: 'owner-1',
      channel: 'workspace:owner-1',
    })
  })

  it('resolve workspace para staff usando companyOwnerUserId', () => {
    const result = resolveOperationsRealtimeWorkspace({
      userId: 'staff-1',
      role: 'STAFF',
      status: 'ACTIVE',
      workspaceOwnerUserId: undefined,
      companyOwnerUserId: 'owner-1',
    } as any)

    expect(result).toEqual({
      workspaceOwnerUserId: 'owner-1',
      channel: 'workspace:owner-1',
    })
  })

  it('bloqueia sessao inativa', () => {
    expect(() =>
      resolveOperationsRealtimeWorkspace({
        userId: 'owner-1',
        role: 'OWNER',
        status: 'INACTIVE',
        workspaceOwnerUserId: 'owner-1',
        companyOwnerUserId: 'owner-1',
      } as any),
    ).toThrow(ForbiddenException)
  })
})
