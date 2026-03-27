import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import type { AuthContext } from '../auth/auth.types'
import {
  buildWorkspaceChannel,
  OPERATIONS_REALTIME_NAMESPACE,
  type OperationsRealtimeEnvelope,
  type OperationsRealtimeEventName,
  type OperationsRealtimeEventPayload,
  type OperationsRealtimeNamespaceLike,
  type OperationsRealtimeWorkspaceListener,
} from './operations-realtime.types'

@Injectable()
export class OperationsRealtimeService {
  private readonly logger = new Logger(OperationsRealtimeService.name)
  private readonly bus = new EventEmitter()
  private namespace: OperationsRealtimeNamespaceLike | null = null

  attachNamespace(namespace: OperationsRealtimeNamespaceLike) {
    this.namespace = namespace
    this.logger.log(`Namespace de operacao pronto em ${OPERATIONS_REALTIME_NAMESPACE}`)
  }

  subscribeWorkspace<TEvent extends OperationsRealtimeEventName>(
    workspaceOwnerUserId: string,
    listener: OperationsRealtimeWorkspaceListener<TEvent>,
  ) {
    const channel = buildWorkspaceChannel(workspaceOwnerUserId)
    this.bus.on(channel, listener as OperationsRealtimeWorkspaceListener)

    return () => {
      this.bus.off(channel, listener as OperationsRealtimeWorkspaceListener)
    }
  }

  publishWorkspaceEvent<TEvent extends OperationsRealtimeEventName>(
    auth: Pick<AuthContext, 'userId' | 'companyOwnerUserId' | 'role'>,
    event: TEvent,
    payload: OperationsRealtimeEventPayload<TEvent>,
  ): OperationsRealtimeEnvelope<TEvent> {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const workspaceChannel = buildWorkspaceChannel(workspaceOwnerUserId)
    const envelope: OperationsRealtimeEnvelope<TEvent> = {
      id: randomUUID(),
      event,
      workspaceOwnerUserId,
      workspaceChannel,
      actorUserId: auth.userId,
      actorRole: auth.role,
      createdAt: new Date().toISOString(),
      payload,
    }

    this.bus.emit(workspaceChannel, envelope)
    this.namespace?.to(workspaceChannel).emit(event, envelope)

    return envelope
  }

  publishCashOpened(
    auth: Pick<AuthContext, 'userId' | 'companyOwnerUserId' | 'role'>,
    payload: OperationsRealtimeEventPayload<'cash.opened'>,
  ) {
    return this.publishWorkspaceEvent(auth, 'cash.opened', payload)
  }

  publishCashUpdated(
    auth: Pick<AuthContext, 'userId' | 'companyOwnerUserId' | 'role'>,
    payload: OperationsRealtimeEventPayload<'cash.updated'>,
  ) {
    return this.publishWorkspaceEvent(auth, 'cash.updated', payload)
  }

  publishComandaOpened(
    auth: Pick<AuthContext, 'userId' | 'companyOwnerUserId' | 'role'>,
    payload: OperationsRealtimeEventPayload<'comanda.opened'>,
  ) {
    return this.publishWorkspaceEvent(auth, 'comanda.opened', payload)
  }

  publishComandaUpdated(
    auth: Pick<AuthContext, 'userId' | 'companyOwnerUserId' | 'role'>,
    payload: OperationsRealtimeEventPayload<'comanda.updated'>,
  ) {
    return this.publishWorkspaceEvent(auth, 'comanda.updated', payload)
  }

  publishComandaClosed(
    auth: Pick<AuthContext, 'userId' | 'companyOwnerUserId' | 'role'>,
    payload: OperationsRealtimeEventPayload<'comanda.closed'>,
  ) {
    return this.publishWorkspaceEvent(auth, 'comanda.closed', payload)
  }

  publishCashClosureUpdated(
    auth: Pick<AuthContext, 'userId' | 'companyOwnerUserId' | 'role'>,
    payload: OperationsRealtimeEventPayload<'cash.closure.updated'>,
  ) {
    return this.publishWorkspaceEvent(auth, 'cash.closure.updated', payload)
  }

  publishKitchenItemQueued(
    auth: Pick<AuthContext, 'userId' | 'companyOwnerUserId' | 'role'>,
    payload: OperationsRealtimeEventPayload<'kitchen.item.queued'>,
  ) {
    return this.publishWorkspaceEvent(auth, 'kitchen.item.queued', payload)
  }

  publishKitchenItemUpdated(
    auth: Pick<AuthContext, 'userId' | 'companyOwnerUserId' | 'role'>,
    payload: OperationsRealtimeEventPayload<'kitchen.item.updated'>,
  ) {
    return this.publishWorkspaceEvent(auth, 'kitchen.item.updated', payload)
  }
}
