import {
  ApiError,
  type TelegramIntegrationStatusResponse,
  type TelegramLinkTokenResponse,
  type WorkspaceNotificationPreference,
} from '@/lib/api'

export type CopyState = 'idle' | 'copied' | 'error'

export type TelegramCardTone = {
  accent: string
  label: string
}

export function resolveTelegramTone(status: TelegramIntegrationStatusResponse | undefined): TelegramCardTone {
  if (!status?.enabled) {
    return { accent: '#f59e0b', label: 'indisponível' }
  }

  if (!status.workspaceEnabled) {
    return { accent: '#f97316', label: 'fechado' }
  }

  if (status.linked) {
    return { accent: '#22c55e', label: 'conectado' }
  }

  return { accent: 'var(--accent, #008cff)', label: 'pronto para conectar' }
}

export function resolveTelegramDescription(status: TelegramIntegrationStatusResponse | undefined) {
  if (!status?.enabled) {
    return 'O backend já suporta o canal, mas o token do bot ainda não está ativo neste ambiente.'
  }

  if (!status.workspaceEnabled) {
    return 'O bot existe, mas este workspace ainda não foi liberado na allowlist operacional.'
  }

  if (status.linked) {
    return 'Seu chat já está vinculado. Você pode renovar o vínculo ou desvincular este Telegram a qualquer momento.'
  }

  return 'Gere o link temporário, abra o Telegram e confirme o /start no bot oficial. O portal acompanha o status automaticamente.'
}

export function shouldKeepPolling(
  status: Pick<TelegramIntegrationStatusResponse, 'linked'> | undefined,
  pendingLink: TelegramLinkTokenResponse | null,
) {
  if (!pendingLink || status?.linked) {
    return false
  }

  return new Date(pendingLink.expiresAt).getTime() > Date.now()
}

export function resolveTelegramCardErrorMessage(...errors: unknown[]) {
  const apiError = errors.find((error) => error instanceof ApiError)
  return apiError instanceof ApiError ? apiError.message : null
}

export function resolveLinkStatusValue(isLinked: boolean, activeLink: TelegramLinkTokenResponse | null) {
  if (isLinked) {
    return 'Conectado'
  }

  if (activeLink) {
    return 'Pendente'
  }

  return 'Desconectado'
}

export function resolveChatHint(isLinked: boolean) {
  if (isLinked) {
    return 'Última leitura do Telegram vinculada a esta conta.'
  }

  return 'O chat só é associado após /start com o token temporário.'
}

export function resolveChatValue(status: TelegramIntegrationStatusResponse | undefined) {
  if (status?.account?.telegramUsername) {
    return `@${status.account.telegramUsername}`
  }

  if (status?.linked) {
    return 'Sem username público'
  }

  return 'Não vinculado'
}

export function resolveCopyButtonLabel(copyState: CopyState) {
  const labels: Record<CopyState, string> = {
    copied: 'Link copiado',
    error: 'Copiar manualmente',
    idle: 'Copiar link',
  }

  return labels[copyState]
}

export function resolveBotValue(status: TelegramIntegrationStatusResponse | undefined) {
  if (!status?.botUsername) {
    return 'Indisponível'
  }

  return `@${status.botUsername}`
}

export function resolvePrimaryButtonLabel(status: TelegramIntegrationStatusResponse | undefined) {
  if (status?.linked) {
    return 'Gerar novo vínculo'
  }

  return 'Gerar link do Telegram'
}

export function resolveActivePendingLink(
  status: TelegramIntegrationStatusResponse | undefined,
  pendingLink: TelegramLinkTokenResponse | null,
) {
  if (status?.linked) {
    return null
  }

  return pendingLink
}

export function resolveBotLink(status: TelegramIntegrationStatusResponse | undefined) {
  if (status?.linked || !status?.deeplinkBase) {
    return null
  }

  return status.deeplinkBase
}

export function canCreateTelegramLink(status: TelegramIntegrationStatusResponse | undefined) {
  return Boolean(status?.enabled && status.workspaceEnabled)
}

export function resolvePreferencesDisabled(
  status: TelegramIntegrationStatusResponse | undefined,
  isMutationPending: boolean,
) {
  return !canCreateTelegramLink(status) || isMutationPending
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function openLink(url: string) {
  if (typeof globalThis.window === 'undefined') {
    return
  }

  globalThis.window.open(url, '_blank', 'noopener,noreferrer')
}

export async function copyLink(url: string, setCopyState: (value: CopyState) => void) {
  try {
    await writeClipboardText(url)
    setCopyState('copied')
  } catch {
    setCopyState('error')
  }
}

export function confirmTelegramUnlink() {
  if (typeof globalThis.window === 'undefined') {
    return true
  }

  return globalThis.window.confirm('Desvincular este chat do Telegram da sua conta atual?')
}

export function buildUpdatedPreferences({
  enabled,
  preferences,
  target,
}: {
  enabled: boolean
  preferences: WorkspaceNotificationPreference[]
  target: WorkspaceNotificationPreference
}) {
  return preferences.map((preference) => resolveUpdatedPreference({ enabled, preference, target }))
}

export function formatPreferenceLabel(preference: WorkspaceNotificationPreference) {
  if (isComandaStatusPreference(preference)) {
    return 'Mudança de status da comanda'
  }

  if (isKitchenItemStatusPreference(preference)) {
    return 'Atualização de item da cozinha'
  }

  return `${preference.channel} · ${preference.eventType}`
}

function resolveUpdatedPreference({
  enabled,
  preference,
  target,
}: {
  enabled: boolean
  preference: WorkspaceNotificationPreference
  target: WorkspaceNotificationPreference
}) {
  if (!isSamePreference(preference, target)) {
    return preference
  }

  return { ...preference, enabled }
}

function isSamePreference(left: WorkspaceNotificationPreference, right: WorkspaceNotificationPreference) {
  return left.channel === right.channel && left.eventType === right.eventType
}

function isComandaStatusPreference(preference: WorkspaceNotificationPreference) {
  return preference.channel === 'TELEGRAM' && preference.eventType === 'operations.comanda.status_changed'
}

function isKitchenItemStatusPreference(preference: WorkspaceNotificationPreference) {
  return preference.channel === 'TELEGRAM' && preference.eventType === 'operations.kitchen_item.status_changed'
}

async function writeClipboardText(url: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    throw new Error('clipboard_unavailable')
  }

  await navigator.clipboard.writeText(url)
}
