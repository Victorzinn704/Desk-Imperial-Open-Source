'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, CheckCircle2, Copy, ExternalLink, Link2Off, RefreshCw } from 'lucide-react'
import {
  ApiError,
  createTelegramLinkToken,
  fetchWorkspaceNotificationPreferences,
  fetchTelegramIntegrationStatus,
  unlinkTelegramIntegration,
  WORKSPACE_NOTIFICATION_PREFERENCES_QUERY_KEY,
  type TelegramLinkTokenResponse,
  type WorkspaceNotificationPreference,
  updateWorkspaceNotificationPreferences,
} from '@/lib/api'
import { Button } from '@/components/shared/button'

type CopyState = 'idle' | 'copied' | 'error'

type TelegramIntegrationCardProps = {
  canManageWorkspacePreferences?: boolean
}

export function TelegramIntegrationCard({
  canManageWorkspacePreferences = true,
}: Readonly<TelegramIntegrationCardProps>) {
  const queryClient = useQueryClient()
  const [pendingLink, setPendingLink] = useState<TelegramLinkTokenResponse | null>(null)
  const [copyState, setCopyState] = useState<CopyState>('idle')

  const statusQuery = useQuery({
    queryKey: ['notifications', 'telegram', 'status'],
    queryFn: fetchTelegramIntegrationStatus,
    staleTime: 30_000,
    refetchInterval: (query) => (shouldKeepPolling(query.state.data, pendingLink) ? 5_000 : false),
  })
  const preferencesQuery = useQuery({
    queryKey: [...WORKSPACE_NOTIFICATION_PREFERENCES_QUERY_KEY],
    queryFn: fetchWorkspaceNotificationPreferences,
    staleTime: 30_000,
    enabled: canManageWorkspacePreferences,
  })

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

  const status = statusQuery.data
  useEffect(() => {
    if (!pendingLink) {
      return
    }

    const expiresAt = new Date(pendingLink.expiresAt).getTime()
    const timeout = globalThis.setTimeout(
      () => {
        setPendingLink(null)
        setCopyState('idle')
      },
      Math.max(0, expiresAt - Date.now()),
    )

    return () => globalThis.clearTimeout(timeout)
  }, [pendingLink])

  const activeLink = status?.linked ? null : pendingLink

  const statusTone = resolveTone(status)
  const errorMessage = resolveTelegramCardErrorMessage(
    createLinkMutation.error,
    unlinkMutation.error,
    preferencesMutation.error,
    statusQuery.error,
  )
  const preferences = preferencesQuery.data?.preferences ?? []
  const preferencesDisabled = !(status?.enabled && status?.workspaceEnabled) || preferencesMutation.isPending
  const linkStatusValue = resolveLinkStatusValue(status?.linked ?? false, activeLink)
  const chatHint = resolveChatHint(status?.linked ?? false)
  const chatValue = resolveChatValue(status)
  const primaryButtonLabel = status?.linked ? 'Gerar novo vínculo' : 'Gerar link do Telegram'
  const copyButtonLabel = resolveCopyButtonLabel(copyState)

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border"
            style={{
              backgroundColor: `${statusTone.accent}12`,
              borderColor: `${statusTone.accent}33`,
              color: statusTone.accent,
            }}
          >
            <Bot className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: statusTone.accent }}>
              Telegram oficial
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
              Conecte sua conta ao bot do Desk Imperial.
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{resolveDescription(status)}</p>
          </div>
        </div>

        <div
          className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{
            borderColor: `${statusTone.accent}33`,
            backgroundColor: `${statusTone.accent}12`,
            color: statusTone.accent,
          }}
        >
          {statusTone.label}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <InfoColumn
          hint="Bot público usado para vínculo e leitura de alertas."
          label="Bot"
          value={status?.botUsername ? `@${status.botUsername}` : 'Indisponível'}
        />
        <InfoColumn
          hint="Quando disponível, o portal gera um link temporário de 10 minutos."
          label="Vínculo"
          value={linkStatusValue}
        />
        <InfoColumn hint={chatHint} label="Chat" value={chatValue} />
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Canal oficial único.</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
          O Telegram do Desk Imperial é definido no servidor e permanece fixo no portal. O usuário só vincula este chat
          ao bot oficial; não existe troca manual para outro bot.
        </p>
      </div>

      <LinkedTelegramAccountSection status={status} />

      <TelegramPreferencesSection
        canManageWorkspacePreferences={canManageWorkspacePreferences}
        preferences={preferences}
        preferencesDisabled={preferencesDisabled}
        onToggle={(preference, enabled) =>
          handleTogglePreference(preference, enabled, preferences, (nextPreferences) =>
            preferencesMutation.mutate(nextPreferences),
          )
        }
      />

      <PendingTelegramLinkSection
        activeLink={activeLink}
        copyButtonLabel={copyButtonLabel}
        onCopyStateChange={setCopyState}
      />

      {errorMessage ? <p className="mt-5 text-sm text-[var(--danger)]">{errorMessage}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          loading={createLinkMutation.isPending}
          size="sm"
          type="button"
          variant="primary"
          disabled={!(status?.enabled && status?.workspaceEnabled)}
          onClick={() => createLinkMutation.mutate()}
        >
          <CheckCircle2 className="size-4" />
          {primaryButtonLabel}
        </Button>
        <Button
          loading={statusQuery.isFetching}
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => void statusQuery.refetch()}
        >
          <RefreshCw className="size-4" />
          Atualizar status
        </Button>
        {status?.linked ? (
          <Button
            loading={unlinkMutation.isPending}
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => handleUnlink(() => unlinkMutation.mutate())}
          >
            <Link2Off className="size-4" />
            Desvincular
          </Button>
        ) : null}
        {!status?.linked && status?.deeplinkBase ? (
          <Button size="sm" type="button" variant="ghost" onClick={() => openLink(status.deeplinkBase!)}>
            <ExternalLink className="size-4" />
            Abrir @{status.botUsername}
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function LinkedTelegramAccountSection({
  status,
}: Readonly<{
  status:
    | {
        linked: boolean
        account: {
          telegramChatId: string
          linkedAt: string
          lastActiveAt: string
        } | null
      }
    | undefined
}>) {
  if (!(status?.linked && status.account)) {
    return null
  }

  return (
    <div className="mt-5 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:grid-cols-3">
      <CompactFact label="Chat ID" value={status.account.telegramChatId} />
      <CompactFact label="Vinculado em" value={formatDateTime(status.account.linkedAt)} />
      <CompactFact label="Última atividade" value={formatDateTime(status.account.lastActiveAt)} />
    </div>
  )
}

function TelegramPreferencesSection({
  canManageWorkspacePreferences,
  preferences,
  preferencesDisabled,
  onToggle,
}: Readonly<{
  canManageWorkspacePreferences: boolean
  preferences: WorkspaceNotificationPreference[]
  preferencesDisabled: boolean
  onToggle: (preference: WorkspaceNotificationPreference, enabled: boolean) => void
}>) {
  if (!canManageWorkspacePreferences) {
    return null
  }

  return (
    <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Ruído operacional do Telegram</p>
        <p className="text-sm leading-6 text-[var(--text-soft)]">
          Estas chaves controlam quais mudanças operacionais podem sair do workspace para o bot oficial.
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {preferences.map((preference) => (
          <label
            key={`${preference.channel}:${preference.eventType}`}
            className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{formatPreferenceLabel(preference)}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
                {preference.inherited ? 'Padrao do workspace' : 'Preferencia personalizada deste workspace'}
              </p>
            </div>
            <input
              aria-label={formatPreferenceLabel(preference)}
              checked={preference.enabled}
              className="mt-1 size-4 accent-[var(--accent)]"
              disabled={preferencesDisabled}
              type="checkbox"
              onChange={(event) => onToggle(preference, event.currentTarget.checked)}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

function PendingTelegramLinkSection({
  activeLink,
  copyButtonLabel,
  onCopyStateChange,
}: Readonly<{
  activeLink: TelegramLinkTokenResponse | null
  copyButtonLabel: string
  onCopyStateChange: (value: CopyState) => void
}>) {
  if (!activeLink) {
    return null
  }

  return (
    <div className="mt-5 rounded-2xl border border-[rgba(0,140,255,0.18)] bg-[rgba(0,140,255,0.08)] p-4">
      <p className="text-sm font-semibold text-[var(--text-primary)]">Link de conexão pronto.</p>
      <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
        Abra o Telegram, confirme o <span className="font-semibold text-[var(--text-primary)]">/start</span> e volte ao
        portal. O link expira em {formatDateTime(activeLink.expiresAt)}.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" type="button" onClick={() => openLink(activeLink.deeplink)}>
          <ExternalLink className="size-4" />
          Abrir Telegram
        </Button>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => void copyLink(activeLink.deeplink, onCopyStateChange)}
        >
          <Copy className="size-4" />
          {copyButtonLabel}
        </Button>
      </div>
      <p className="mt-3 break-all text-xs leading-5 text-[var(--text-soft)]">{activeLink.deeplink}</p>
    </div>
  )
}

function InfoColumn({ hint, label, value }: Readonly<{ hint: string; label: string; value: string }>) {
  return (
    <div className="border-l-2 border-[var(--border)] pl-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}

function CompactFact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

function resolveTone(
  status:
    | {
        enabled: boolean
        workspaceEnabled: boolean
        linked: boolean
      }
    | undefined,
) {
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

function resolveDescription(
  status:
    | {
        enabled: boolean
        workspaceEnabled: boolean
        linked: boolean
      }
    | undefined,
) {
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

function shouldKeepPolling(
  status:
    | {
        linked: boolean
      }
    | undefined,
  pendingLink: TelegramLinkTokenResponse | null,
) {
  if (!pendingLink || status?.linked) {
    return false
  }

  return new Date(pendingLink.expiresAt).getTime() > Date.now()
}

function resolveTelegramCardErrorMessage(...errors: unknown[]) {
  const apiError = errors.find((error) => error instanceof ApiError)
  return apiError instanceof ApiError ? apiError.message : null
}

function resolveLinkStatusValue(isLinked: boolean, activeLink: TelegramLinkTokenResponse | null) {
  if (isLinked) {
    return 'Conectado'
  }

  if (activeLink) {
    return 'Pendente'
  }

  return 'Desconectado'
}

function resolveChatHint(isLinked: boolean) {
  return isLinked
    ? 'Última leitura do Telegram vinculada a esta conta.'
    : 'O chat só é associado após /start com o token temporário.'
}

function resolveChatValue(
  status:
    | {
        linked: boolean
        account?: {
          telegramUsername: string | null
        } | null
      }
    | undefined,
) {
  if (status?.account?.telegramUsername) {
    return `@${status.account.telegramUsername}`
  }

  if (status?.linked) {
    return 'Sem username público'
  }

  return 'Não vinculado'
}

function resolveCopyButtonLabel(copyState: CopyState) {
  if (copyState === 'copied') {
    return 'Link copiado'
  }

  if (copyState === 'error') {
    return 'Copiar manualmente'
  }

  return 'Copiar link'
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function openLink(url: string) {
  if (typeof globalThis.window === 'undefined') {
    return
  }

  globalThis.window.open(url, '_blank', 'noopener,noreferrer')
}

async function copyLink(url: string, setCopyState: (value: CopyState) => void) {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error('clipboard_unavailable')
    }
    await navigator.clipboard.writeText(url)
    setCopyState('copied')
  } catch {
    setCopyState('error')
  }
}

function handleUnlink(unlink: () => void) {
  if (typeof globalThis.window !== 'undefined') {
    const confirmed = globalThis.window.confirm('Desvincular este chat do Telegram da sua conta atual?')
    if (!confirmed) {
      return
    }
  }

  unlink()
}

function handleTogglePreference(
  target: WorkspaceNotificationPreference,
  enabled: boolean,
  preferences: WorkspaceNotificationPreference[],
  submit: (preferences: WorkspaceNotificationPreference[]) => void,
) {
  submit(
    preferences.map((preference) =>
      preference.channel === target.channel && preference.eventType === target.eventType
        ? { ...preference, enabled }
        : preference,
    ),
  )
}

function formatPreferenceLabel(preference: WorkspaceNotificationPreference) {
  if (preference.channel === 'TELEGRAM' && preference.eventType === 'operations.comanda.status_changed') {
    return 'Mudança de status da comanda'
  }

  if (preference.channel === 'TELEGRAM' && preference.eventType === 'operations.kitchen_item.status_changed') {
    return 'Atualização de item da cozinha'
  }

  return `${preference.channel} · ${preference.eventType}`
}
