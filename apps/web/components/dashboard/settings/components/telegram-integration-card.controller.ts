'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTelegramLinkToken,
  fetchTelegramIntegrationStatus,
  fetchWorkspaceNotificationPreferences,
  type TelegramIntegrationStatusResponse,
  type TelegramLinkTokenResponse,
  unlinkTelegramIntegration,
  updateWorkspaceNotificationPreferences,
  WORKSPACE_NOTIFICATION_PREFERENCES_QUERY_KEY,
  type WorkspaceNotificationPreference,
} from '@/lib/api'
import {
  buildUpdatedPreferences,
  canCreateTelegramLink,
  confirmTelegramUnlink,
  copyLink,
  type CopyState,
  openLink,
  resolveActivePendingLink,
  resolveBotLink,
  resolveBotValue,
  resolveChatHint,
  resolveChatValue,
  resolveCopyButtonLabel,
  resolveLinkStatusValue,
  resolvePreferencesDisabled,
  resolvePrimaryButtonLabel,
  resolveTelegramCardErrorMessage,
  resolveTelegramDescription,
  resolveTelegramTone,
  shouldKeepPolling,
  type TelegramCardTone,
} from './telegram-integration-card.model'

export type TelegramIntegrationCardController = {
  activeLink: TelegramLinkTokenResponse | null
  botLink: string | null
  botValue: string
  canCreateLink: boolean
  canManageWorkspacePreferences: boolean
  chatHint: string
  chatValue: string
  copyButtonLabel: string
  description: string
  errorMessage: string | null
  isCreateLinkPending: boolean
  isRefreshPending: boolean
  isUnlinkPending: boolean
  linkStatusValue: string
  preferences: WorkspaceNotificationPreference[]
  preferencesDisabled: boolean
  primaryButtonLabel: string
  status: TelegramIntegrationStatusResponse | undefined
  statusTone: TelegramCardTone
  copyPendingLink: () => void
  createLink: () => void
  openBot: () => void
  openPendingLink: () => void
  refreshStatus: () => void
  togglePreference: (preference: WorkspaceNotificationPreference, enabled: boolean) => void
  unlink: () => void
}

type TelegramIntegrationCardControllerInput = {
  canManageWorkspacePreferences: boolean
}

export function useTelegramIntegrationCardController({
  canManageWorkspacePreferences,
}: TelegramIntegrationCardControllerInput): TelegramIntegrationCardController {
  const queryClient = useQueryClient()
  const [pendingLink, setPendingLink] = useState<TelegramLinkTokenResponse | null>(null)
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const statusQuery = useTelegramStatusQuery(pendingLink)
  const preferencesQuery = useTelegramPreferencesQuery(canManageWorkspacePreferences)
  const mutations = useTelegramMutations({ queryClient, setCopyState, setPendingLink })

  usePendingTelegramLinkExpiry({ pendingLink, setCopyState, setPendingLink })

  return buildController({
    canManageWorkspacePreferences,
    copyState,
    mutations,
    pendingLink,
    preferencesQuery,
    setCopyState,
    statusQuery,
  })
}

function useTelegramStatusQuery(pendingLink: TelegramLinkTokenResponse | null) {
  return useQuery({
    queryKey: ['notifications', 'telegram', 'status'],
    queryFn: fetchTelegramIntegrationStatus,
    refetchInterval: (query) => (shouldKeepPolling(query.state.data, pendingLink) ? 5_000 : false),
    staleTime: 30_000,
  })
}

function useTelegramPreferencesQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: fetchWorkspaceNotificationPreferences,
    queryKey: [...WORKSPACE_NOTIFICATION_PREFERENCES_QUERY_KEY],
    staleTime: 30_000,
  })
}

function useTelegramMutations({
  queryClient,
  setCopyState,
  setPendingLink,
}: {
  queryClient: ReturnType<typeof useQueryClient>
  setCopyState: (value: CopyState) => void
  setPendingLink: (value: TelegramLinkTokenResponse | null) => void
}) {
  const createLinkMutation = useMutation({
    mutationFn: createTelegramLinkToken,
    onSuccess: (data) => {
      setPendingLink(data)
      setCopyState('idle')
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'telegram', 'status'] })
    },
  })
  const unlinkMutation = useMutation({
    mutationFn: unlinkTelegramIntegration,
    onSuccess: () => {
      setPendingLink(null)
      setCopyState('idle')
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'telegram', 'status'] })
    },
  })
  const preferencesMutation = useMutation({
    mutationFn: updateWorkspaceNotificationPreferences,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...WORKSPACE_NOTIFICATION_PREFERENCES_QUERY_KEY] })
    },
  })

  return { createLinkMutation, preferencesMutation, unlinkMutation }
}

function usePendingTelegramLinkExpiry({
  pendingLink,
  setCopyState,
  setPendingLink,
}: {
  pendingLink: TelegramLinkTokenResponse | null
  setCopyState: (value: CopyState) => void
  setPendingLink: (value: TelegramLinkTokenResponse | null) => void
}) {
  useEffect(() => {
    if (!pendingLink) {
      return
    }

    const timeout = globalThis.setTimeout(() => {
      setPendingLink(null)
      setCopyState('idle')
    }, resolvePendingLinkTimeoutMs(pendingLink))

    return () => globalThis.clearTimeout(timeout)
  }, [pendingLink, setCopyState, setPendingLink])
}

function buildController({
  canManageWorkspacePreferences,
  copyState,
  mutations,
  pendingLink,
  preferencesQuery,
  setCopyState,
  statusQuery,
}: {
  canManageWorkspacePreferences: boolean
  copyState: CopyState
  mutations: ReturnType<typeof useTelegramMutations>
  pendingLink: TelegramLinkTokenResponse | null
  preferencesQuery: ReturnType<typeof useTelegramPreferencesQuery>
  setCopyState: (value: CopyState) => void
  statusQuery: ReturnType<typeof useTelegramStatusQuery>
}): TelegramIntegrationCardController {
  const status = statusQuery.data
  const activeLink = resolveActivePendingLink(status, pendingLink)
  const preferences = preferencesQuery.data?.preferences ?? []

  return {
    ...buildControllerState({
      activeLink,
      canManageWorkspacePreferences,
      copyState,
      isStatusFetching: statusQuery.isFetching,
      mutations,
      preferences,
      status,
      statusError: statusQuery.error,
    }),
    copyPendingLink: () => activeLink && void copyLink(activeLink.deeplink, setCopyState),
    createLink: () => mutations.createLinkMutation.mutate(),
    openBot: () => openBotLink(status),
    openPendingLink: () => activeLink && openLink(activeLink.deeplink),
    refreshStatus: () => void statusQuery.refetch(),
    togglePreference: (preference, enabled) => updatePreference({ enabled, mutations, preference, preferences }),
    unlink: () => unlinkTelegram({ mutation: mutations.unlinkMutation }),
  }
}

function buildControllerState({
  activeLink,
  canManageWorkspacePreferences,
  copyState,
  isStatusFetching,
  mutations,
  preferences,
  status,
  statusError,
}: {
  activeLink: TelegramLinkTokenResponse | null
  canManageWorkspacePreferences: boolean
  copyState: CopyState
  isStatusFetching: boolean
  mutations: ReturnType<typeof useTelegramMutations>
  preferences: WorkspaceNotificationPreference[]
  status: TelegramIntegrationStatusResponse | undefined
  statusError: unknown
}) {
  return {
    activeLink,
    botLink: resolveBotLink(status),
    botValue: resolveBotValue(status),
    canCreateLink: canCreateTelegramLink(status),
    canManageWorkspacePreferences,
    chatHint: resolveChatHint(status?.linked ?? false),
    chatValue: resolveChatValue(status),
    copyButtonLabel: resolveCopyButtonLabel(copyState),
    description: resolveTelegramDescription(status),
    errorMessage: resolveControllerErrorMessage(mutations, statusError),
    isCreateLinkPending: mutations.createLinkMutation.isPending,
    isRefreshPending: isStatusFetching,
    isUnlinkPending: mutations.unlinkMutation.isPending,
    linkStatusValue: resolveLinkStatusValue(status?.linked ?? false, activeLink),
    preferences,
    preferencesDisabled: resolvePreferencesDisabled(status, mutations.preferencesMutation.isPending),
    primaryButtonLabel: resolvePrimaryButtonLabel(status),
    status,
    statusTone: resolveTelegramTone(status),
  }
}

function resolveControllerErrorMessage(mutations: ReturnType<typeof useTelegramMutations>, statusError: unknown) {
  return resolveTelegramCardErrorMessage(
    mutations.createLinkMutation.error,
    mutations.unlinkMutation.error,
    mutations.preferencesMutation.error,
    statusError,
  )
}

function resolvePendingLinkTimeoutMs(pendingLink: TelegramLinkTokenResponse) {
  return Math.max(0, new Date(pendingLink.expiresAt).getTime() - Date.now())
}

function openBotLink(status: TelegramIntegrationStatusResponse | undefined) {
  const botLink = resolveBotLink(status)
  if (botLink) {
    openLink(botLink)
  }
}

function updatePreference({
  enabled,
  mutations,
  preference,
  preferences,
}: {
  enabled: boolean
  mutations: ReturnType<typeof useTelegramMutations>
  preference: WorkspaceNotificationPreference
  preferences: WorkspaceNotificationPreference[]
}) {
  mutations.preferencesMutation.mutate(buildUpdatedPreferences({ enabled, preferences, target: preference }))
}

function unlinkTelegram({ mutation }: { mutation: ReturnType<typeof useTelegramMutations>['unlinkMutation'] }) {
  if (confirmTelegramUnlink()) {
    mutation.mutate()
  }
}
