import { Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/shared/button'
import type {
  TelegramIntegrationStatusResponse,
  TelegramLinkTokenResponse,
  WorkspaceNotificationPreference,
} from '@/lib/api'
import { formatDateTime, formatPreferenceLabel } from './telegram-integration-card.model'

export function LinkedTelegramAccountSection({
  status,
}: Readonly<{
  status: TelegramIntegrationStatusResponse | undefined
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

export function TelegramPreferencesSection({
  canManageWorkspacePreferences,
  onToggle,
  preferences,
  preferencesDisabled,
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
          <TelegramPreferenceToggle
            disabled={preferencesDisabled}
            key={`${preference.channel}:${preference.eventType}`}
            preference={preference}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}

export function PendingTelegramLinkSection({
  activeLink,
  copyButtonLabel,
  onCopy,
  onOpen,
}: Readonly<{
  activeLink: TelegramLinkTokenResponse | null
  copyButtonLabel: string
  onCopy: () => void
  onOpen: () => void
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
        <Button size="sm" type="button" onClick={onOpen}>
          <ExternalLink className="size-4" />
          Abrir Telegram
        </Button>
        <Button size="sm" type="button" variant="secondary" onClick={onCopy}>
          <Copy className="size-4" />
          {copyButtonLabel}
        </Button>
      </div>
      <p className="mt-3 break-all text-xs leading-5 text-[var(--text-soft)]">{activeLink.deeplink}</p>
    </div>
  )
}

export function InfoColumn({ hint, label, value }: Readonly<{ hint: string; label: string; value: string }>) {
  return (
    <div className="border-l-2 border-[var(--border)] pl-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}

function TelegramPreferenceToggle({
  disabled,
  onToggle,
  preference,
}: Readonly<{
  disabled: boolean
  onToggle: (preference: WorkspaceNotificationPreference, enabled: boolean) => void
  preference: WorkspaceNotificationPreference
}>) {
  const label = formatPreferenceLabel(preference)

  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">{resolvePreferenceDescription(preference)}</p>
      </div>
      <input
        aria-label={label}
        checked={preference.enabled}
        className="mt-1 size-4 accent-[var(--accent)]"
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onToggle(preference, event.currentTarget.checked)}
      />
    </label>
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

function resolvePreferenceDescription(preference: WorkspaceNotificationPreference) {
  if (preference.inherited) {
    return 'Padrão do workspace'
  }

  return 'Preferência personalizada deste workspace'
}
