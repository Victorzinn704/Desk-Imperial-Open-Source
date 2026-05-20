import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import {
  recordOperationsRealtimeMutationFirstEmitTelemetry,
  recordOperationsRealtimePublishTelemetry,
} from '../../common/observability/business-telemetry.util'
import type { WorkspaceScopedAuthContext } from '../auth/auth.types'
import {
  buildWorkspaceChannel,
  type OperationsRealtimeEnvelope,
  type OperationsRealtimeEventName,
  type OperationsRealtimeEventPayload,
  type OperationsRealtimeNamespaceLike,
  type OperationsRealtimePublishInstrumentation,
  type OperationsRealtimeWorkspaceListener,
  resolveOperationsRealtimeEventChannels,
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
    const context = this.buildPublishContext(auth, event, envelope)

    try {
      this.dispatchEnvelope(event, envelope, context.targetChannels)
      this.recordPublishSuccess(startedAt, context)
      this.recordMutationFirstEmitTelemetry(instrumentation, performance.now(), {
        'desk.operations.realtime.event': event,
        'desk.operations.realtime.actor_role': auth.role,
      })
    } catch (error) {
      this.recordPublishFailure(startedAt, context)
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

  private resolvePayloadBytes() {
    // TODO: implement non-blocking size estimation.
    // Sync JSON.stringify was blocking the Event Loop on large payloads.
    return 0
  }

  private buildPublishContext<TEvent extends OperationsRealtimeEventName>(
    auth: WorkspaceScopedAuthContext,
    event: TEvent,
    envelope: OperationsRealtimeEnvelope<TEvent>,
  ) {
    const targetChannels = resolveOperationsRealtimeEventChannels(envelope.workspaceOwnerUserId, event)
    const workspaceListenerCount = this.bus.listenerCount(envelope.workspaceChannel)
    const globalListenerCount = this.bus.listenerCount(OperationsRealtimeService.GLOBAL_CHANNEL)

    return {
      dispatchTargets: workspaceListenerCount + globalListenerCount + (this.namespace ? targetChannels.length : 0),
      globalListenerCount,
      payloadBytes: this.resolvePayloadBytes(),
      socketRoomSize: this.resolveSocketRoomSize(targetChannels),
      targetChannels,
      telemetryAttributes: {
        'desk.operations.realtime.event': event,
        'desk.operations.realtime.actor_role': auth.role,
        'desk.operations.realtime.has_socket_namespace': Boolean(this.namespace),
        'desk.operations.realtime.workspace_listener_count': workspaceListenerCount,
        'desk.operations.realtime.global_listener_count': globalListenerCount,
        'desk.operations.realtime.publish_result': 'ok',
      } as const,
      workspaceListenerCount,
    }
  }

  private dispatchEnvelope<TEvent extends OperationsRealtimeEventName>(
    event: TEvent,
    envelope: OperationsRealtimeEnvelope<TEvent>,
    targetChannels: string[],
  ) {
    this.bus.emit(envelope.workspaceChannel, envelope)
    this.bus.emit(OperationsRealtimeService.GLOBAL_CHANNEL, envelope)

    for (const channel of targetChannels) {
      this.namespace?.to(channel).emit(event, envelope)
    }
  }

  private recordPublishTelemetry(
    startedAt: number,
    context: ReturnType<OperationsRealtimeService['buildPublishContext']>,
    isError = false,
  ) {
    const telemetryAttributes = isError
      ? {
          ...context.telemetryAttributes,
          'desk.operations.realtime.publish_result': 'error',
        }
      : context.telemetryAttributes

    recordOperationsRealtimePublishTelemetry(
      performance.now() - startedAt,
      this.buildPublishMetrics(context),
      telemetryAttributes,
    )
  }

  private recordPublishSuccess(
    startedAt: number,
    context: ReturnType<OperationsRealtimeService['buildPublishContext']>,
  ) {
    this.recordPublishTelemetry(startedAt, context, false)
  }

  private recordPublishFailure(
    startedAt: number,
    context: ReturnType<OperationsRealtimeService['buildPublishContext']>,
  ) {
    this.recordPublishTelemetry(startedAt, context, true)
  }

  private buildPublishMetrics(context: ReturnType<OperationsRealtimeService['buildPublishContext']>) {
    return {
      dispatchTargets: context.dispatchTargets,
      globalListenerCount: context.globalListenerCount,
      payloadBytes: context.payloadBytes,
      socketRoomSize: context.socketRoomSize,
      workspaceListenerCount: context.workspaceListenerCount,
    }
  }

  private resolveSocketRoomSize(channels: string[]) {
    const rooms = (this.namespace as { adapter?: { rooms?: Map<string, Set<string> | { size: number }> } } | null)
      ?.adapter?.rooms
    if (!rooms) {
      return null
    }

    let resolvedAnyRoom = false

    const totalRoomSize = channels.reduce((sum, channel) => {
      const room = rooms.get(channel)
      if (!room) {
        return sum
      }

      resolvedAnyRoom = true
      if (room instanceof Set) {
        return sum + room.size
      }

      if (typeof room.size === 'number') {
        return sum + room.size
      }

      return sum
    }, 0)

    return resolvedAnyRoom ? totalRoomSize : 0
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
