import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import { recordOperationsRealtimePublishTelemetry } from '../../common/observability/business-telemetry.util'
import type { WorkspaceScopedAuthContext } from '../auth/auth.types'
import {
  buildWorkspaceChannel,
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

  private buildEnvelope<TEvent extends OperationsRealtimeEventName>(
    auth: WorkspaceScopedAuthContext,
    event: TEvent,
    payload: OperationsRealtimeEventPayload<TEvent>,
  ): OperationsRealtimeEnvelope<TEvent> {
    const workspace = this.resolveWorkspace(auth)

    return {
      id: randomUUID(),
      event,
      workspaceOwnerUserId: workspace.workspaceOwnerUserId,
      workspaceChannel: workspace.workspaceChannel,
      actorUserId: resolveAuthActorUserId(auth),
      actorRole: auth.role,
      createdAt: new Date().toISOString(),
      payload,
    }
  }

  attachNamespace(namespace: OperationsRealtimeNamespaceLike) {
    this.namespace = namespace
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
    auth: WorkspaceScopedAuthContext,
    event: TEvent,
    payload: OperationsRealtimeEventPayload<TEvent>,
  ): OperationsRealtimeEnvelope<TEvent> {
    const startedAt = performance.now()
    const envelope = this.buildEnvelope(auth, event, payload)
    const listenerCount = this.bus.listenerCount(envelope.workspaceChannel)

    try {
      this.bus.emit(envelope.workspaceChannel, envelope)
      this.namespace?.to(envelope.workspaceChannel).emit(event, envelope)
      recordOperationsRealtimePublishTelemetry(performance.now() - startedAt, {
        'desk.operations.realtime.event': event,
        'desk.operations.realtime.actor_role': auth.role,
        'desk.operations.realtime.has_socket_namespace': Boolean(this.namespace),
        'desk.operations.realtime.workspace_listener_count': listenerCount,
        'desk.operations.realtime.publish_result': 'ok',
      })
    } catch (error) {
      recordOperationsRealtimePublishTelemetry(performance.now() - startedAt, {
        'desk.operations.realtime.event': event,
        'desk.operations.realtime.actor_role': auth.role,
        'desk.operations.realtime.has_socket_namespace': Boolean(this.namespace),
        'desk.operations.realtime.workspace_listener_count': listenerCount,
        'desk.operations.realtime.publish_result': 'error',
      })
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.error(`Falha ao publicar evento realtime ${event}: ${reason}`)
      throw error
    }

    return envelope
  }

  publishCashOpened(auth: WorkspaceScopedAuthContext, payload: OperationsRealtimeEventPayload<'cash.opened'>) {
    return this.publishWorkspaceEvent(auth, 'cash.opened', payload)
  }

  publishCashUpdated(auth: WorkspaceScopedAuthContext, payload: OperationsRealtimeEventPayload<'cash.updated'>) {
    return this.publishWorkspaceEvent(auth, 'cash.updated', payload)
  }

  publishComandaOpened(auth: WorkspaceScopedAuthContext, payload: OperationsRealtimeEventPayload<'comanda.opened'>) {
    return this.publishWorkspaceEvent(auth, 'comanda.opened', payload)
  }

  publishComandaUpdated(auth: WorkspaceScopedAuthContext, payload: OperationsRealtimeEventPayload<'comanda.updated'>) {
    return this.publishWorkspaceEvent(auth, 'comanda.updated', payload)
  }

  publishComandaClosed(auth: WorkspaceScopedAuthContext, payload: OperationsRealtimeEventPayload<'comanda.closed'>) {
    return this.publishWorkspaceEvent(auth, 'comanda.closed', payload)
  }

  publishCashClosureUpdated(
    auth: WorkspaceScopedAuthContext,
    payload: OperationsRealtimeEventPayload<'cash.closure.updated'>,
  ) {
    return this.publishWorkspaceEvent(auth, 'cash.closure.updated', payload)
  }

  publishKitchenItemQueued(
    auth: WorkspaceScopedAuthContext,
    payload: OperationsRealtimeEventPayload<'kitchen.item.queued'>,
  ) {
    return this.publishWorkspaceEvent(auth, 'kitchen.item.queued', payload)
  }

  publishKitchenItemUpdated(
    auth: WorkspaceScopedAuthContext,
    payload: OperationsRealtimeEventPayload<'kitchen.item.updated'>,
  ) {
    return this.publishWorkspaceEvent(auth, 'kitchen.item.updated', payload)
  }

  publishMesaUpserted(auth: WorkspaceScopedAuthContext, payload: OperationsRealtimeEventPayload<'mesa.upserted'>) {
    return this.publishWorkspaceEvent(auth, 'mesa.upserted', payload)
  }

  private resolveWorkspace(auth: WorkspaceScopedAuthContext) {
    const workspaceOwnerUserId = auth.workspaceOwnerUserId ?? auth.companyOwnerUserId ?? auth.userId
    return {
      workspaceOwnerUserId,
      workspaceChannel: buildWorkspaceChannel(workspaceOwnerUserId),
    }
  }
}
