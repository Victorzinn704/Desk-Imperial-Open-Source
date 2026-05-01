import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter } from 'node:events'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import {
  recordOperationsRealtimeMutationFirstEmitTelemetry,
  recordOperationsRealtimePublishTelemetry,
} from '../../common/observability/business-telemetry.util'
import type { WorkspaceScopedAuthContext } from '../auth/auth.types'
import {
  buildWorkspaceChannel,
  resolveOperationsRealtimeEventChannels,
  type OperationsRealtimeEnvelope,
  type OperationsRealtimeEventName,
  type OperationsRealtimeEventPayload,
  type OperationsRealtimePublishInstrumentation,
  type OperationsRealtimeNamespaceLike,
  type OperationsRealtimeWorkspaceListener,
} from './operations-realtime.types'

@Injectable()
export class OperationsRealtimeService {
  private static readonly GLOBAL_CHANNEL = '__all__'
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

  subscribeAll(listener: OperationsRealtimeWorkspaceListener) {
    this.bus.on(OperationsRealtimeService.GLOBAL_CHANNEL, listener)

    return () => {
      this.bus.off(OperationsRealtimeService.GLOBAL_CHANNEL, listener)
    }
  }

  publishWorkspaceEvent<TEvent extends OperationsRealtimeEventName>(
    auth: WorkspaceScopedAuthContext,
    event: TEvent,
    payload: OperationsRealtimeEventPayload<TEvent>,
    instrumentation?: OperationsRealtimePublishInstrumentation,
  ): OperationsRealtimeEnvelope<TEvent> {
    const startedAt = performance.now()
    const envelope = this.buildEnvelope(auth, event, payload)
    const targetChannels = resolveOperationsRealtimeEventChannels(envelope.workspaceOwnerUserId, event)
    const workspaceListenerCount = this.bus.listenerCount(envelope.workspaceChannel)
    const globalListenerCount = this.bus.listenerCount(OperationsRealtimeService.GLOBAL_CHANNEL)
    const socketRoomSize = this.resolveSocketRoomSize(targetChannels)
    const dispatchTargets = workspaceListenerCount + globalListenerCount + (this.namespace ? targetChannels.length : 0)
    const payloadBytes = this.resolvePayloadBytes(envelope)
    const telemetryAttributes = {
      'desk.operations.realtime.event': event,
      'desk.operations.realtime.actor_role': auth.role,
      'desk.operations.realtime.has_socket_namespace': Boolean(this.namespace),
      'desk.operations.realtime.workspace_listener_count': workspaceListenerCount,
      'desk.operations.realtime.global_listener_count': globalListenerCount,
      'desk.operations.realtime.publish_result': 'ok',
    } as const

    try {
      this.bus.emit(envelope.workspaceChannel, envelope)
      this.bus.emit(OperationsRealtimeService.GLOBAL_CHANNEL, envelope)
      for (const channel of targetChannels) {
        this.namespace?.to(channel).emit(event, envelope)
      }
      recordOperationsRealtimePublishTelemetry(
        performance.now() - startedAt,
        {
          payloadBytes,
          workspaceListenerCount,
          globalListenerCount,
          dispatchTargets,
          socketRoomSize,
        },
        telemetryAttributes,
      )
      this.recordMutationFirstEmitTelemetry(instrumentation, performance.now(), {
        'desk.operations.realtime.event': event,
        'desk.operations.realtime.actor_role': auth.role,
      })
    } catch (error) {
      recordOperationsRealtimePublishTelemetry(
        performance.now() - startedAt,
        {
          payloadBytes,
          workspaceListenerCount,
          globalListenerCount,
          dispatchTargets,
          socketRoomSize,
        },
        {
          ...telemetryAttributes,
          'desk.operations.realtime.publish_result': 'error',
        },
      )
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.error(`Falha ao publicar evento realtime ${event}: ${reason}`)
      throw error
    }

    return envelope
  }

  publishCashOpened(
    auth: WorkspaceScopedAuthContext,
    payload: OperationsRealtimeEventPayload<'cash.opened'>,
    instrumentation?: OperationsRealtimePublishInstrumentation,
  ) {
    return this.publishWorkspaceEvent(auth, 'cash.opened', payload, instrumentation)
  }

  publishCashUpdated(
    auth: WorkspaceScopedAuthContext,
    payload: OperationsRealtimeEventPayload<'cash.updated'>,
    instrumentation?: OperationsRealtimePublishInstrumentation,
  ) {
    return this.publishWorkspaceEvent(auth, 'cash.updated', payload, instrumentation)
  }

  publishComandaOpened(
    auth: WorkspaceScopedAuthContext,
    payload: OperationsRealtimeEventPayload<'comanda.opened'>,
    instrumentation?: OperationsRealtimePublishInstrumentation,
  ) {
    return this.publishWorkspaceEvent(auth, 'comanda.opened', payload, instrumentation)
  }

  publishComandaUpdated(
    auth: WorkspaceScopedAuthContext,
    payload: OperationsRealtimeEventPayload<'comanda.updated'>,
    instrumentation?: OperationsRealtimePublishInstrumentation,
  ) {
    return this.publishWorkspaceEvent(auth, 'comanda.updated', payload, instrumentation)
  }

  publishComandaClosed(
    auth: WorkspaceScopedAuthContext,
    payload: OperationsRealtimeEventPayload<'comanda.closed'>,
    instrumentation?: OperationsRealtimePublishInstrumentation,
  ) {
    return this.publishWorkspaceEvent(auth, 'comanda.closed', payload, instrumentation)
  }

  publishCashClosureUpdated(
    auth: WorkspaceScopedAuthContext,
    payload: OperationsRealtimeEventPayload<'cash.closure.updated'>,
    instrumentation?: OperationsRealtimePublishInstrumentation,
  ) {
    return this.publishWorkspaceEvent(auth, 'cash.closure.updated', payload, instrumentation)
  }

  publishKitchenItemQueued(
    auth: WorkspaceScopedAuthContext,
    payload: OperationsRealtimeEventPayload<'kitchen.item.queued'>,
    instrumentation?: OperationsRealtimePublishInstrumentation,
  ) {
    return this.publishWorkspaceEvent(auth, 'kitchen.item.queued', payload, instrumentation)
  }

  publishKitchenItemUpdated(
    auth: WorkspaceScopedAuthContext,
    payload: OperationsRealtimeEventPayload<'kitchen.item.updated'>,
    instrumentation?: OperationsRealtimePublishInstrumentation,
  ) {
    return this.publishWorkspaceEvent(auth, 'kitchen.item.updated', payload, instrumentation)
  }

  publishMesaUpserted(
    auth: WorkspaceScopedAuthContext,
    payload: OperationsRealtimeEventPayload<'mesa.upserted'>,
    instrumentation?: OperationsRealtimePublishInstrumentation,
  ) {
    return this.publishWorkspaceEvent(auth, 'mesa.upserted', payload, instrumentation)
  }

  private resolveWorkspace(auth: WorkspaceScopedAuthContext) {
    const workspaceOwnerUserId = auth.workspaceOwnerUserId ?? auth.companyOwnerUserId ?? auth.userId
    return {
      workspaceOwnerUserId,
      workspaceChannel: buildWorkspaceChannel(workspaceOwnerUserId),
    }
  }

  private resolvePayloadBytes(_payload: unknown) {
    // TODO: implement non-blocking size estimation.
    // Sync JSON.stringify was blocking the Event Loop on large payloads.
    return 0
  }

  private resolveSocketRoomSize(channels: string[]) {
    const rooms = (this.namespace as { adapter?: { rooms?: Map<string, Set<string> | { size: number }> } } | null)?.adapter
      ?.rooms
    if (!rooms) {
      return null
    }

    let totalRoomSize = 0
    let resolvedAnyRoom = false

    for (const channel of channels) {
      const room = rooms.get(channel)
      if (!room) {
        continue
      }

      resolvedAnyRoom = true

      if (room instanceof Set) {
        totalRoomSize += room.size
        continue
      }

      if (typeof room.size === 'number') {
        totalRoomSize += room.size
      }
    }

    if (!resolvedAnyRoom) {
      return 0
    }

    return totalRoomSize
  }

  private recordMutationFirstEmitTelemetry(
    instrumentation: OperationsRealtimePublishInstrumentation | undefined,
    emittedAt: number,
    attributes: {
      'desk.operations.realtime.event': OperationsRealtimeEventName
      'desk.operations.realtime.actor_role': WorkspaceScopedAuthContext['role']
    },
  ) {
    if (!instrumentation) {
      return
    }

    recordOperationsRealtimeMutationFirstEmitTelemetry(Math.max(0, emittedAt - instrumentation.mutationStartedAtMs), {
      ...attributes,
      'desk.operations.realtime.mutation': instrumentation.mutationName,
    })
  }
}
