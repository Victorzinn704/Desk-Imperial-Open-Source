import { Bot, CheckCircle2, ExternalLink, Link2Off, RefreshCw } from 'lucide-react'
import { Button } from '@/components/shared/button'
import type { TelegramIntegrationCardController } from './telegram-integration-card.controller'
import {
  InfoColumn,
  LinkedTelegramAccountSection,
  PendingTelegramLinkSection,
  TelegramPreferencesSection,
} from './telegram-integration-card.sections'
import type { TelegramCardTone } from './telegram-integration-card.model'

export function TelegramIntegrationCardView({
  controller,
}: Readonly<{ controller: TelegramIntegrationCardController }>) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
      <TelegramCardHeader controller={controller} />
      <TelegramInfoGrid controller={controller} />
      <TelegramOfficialNotice />
      <LinkedTelegramAccountSection status={controller.status} />
      <TelegramPreferencesSection
        canManageWorkspacePreferences={controller.canManageWorkspacePreferences}
        preferences={controller.preferences}
        preferencesDisabled={controller.preferencesDisabled}
        onToggle={controller.togglePreference}
      />
      <PendingTelegramLinkSection
        activeLink={controller.activeLink}
        copyButtonLabel={controller.copyButtonLabel}
        onCopy={controller.copyPendingLink}
        onOpen={controller.openPendingLink}
      />
      {controller.errorMessage ? <p className="mt-5 text-sm text-[var(--danger)]">{controller.errorMessage}</p> : null}
      <TelegramActions controller={controller} />
    </section>
  )
}

function TelegramCardHeader({ controller }: Readonly<{ controller: TelegramIntegrationCardController }>) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 gap-3">
        <TelegramIcon tone={controller.statusTone} />
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: controller.statusTone.accent }}
          >
            Telegram oficial
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            Conecte sua conta ao bot do Desk Imperial.
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{controller.description}</p>
        </div>
      </div>
      <TelegramStatusBadge tone={controller.statusTone} />
    </div>
  )
}

function TelegramIcon({ tone }: Readonly<{ tone: TelegramCardTone }>) {
  return (
    <span
      className="flex size-11 shrink-0 items-center justify-center rounded-2xl border"
      style={{
        backgroundColor: `${tone.accent}12`,
        borderColor: `${tone.accent}33`,
        color: tone.accent,
      }}
    >
      <Bot className="size-4" />
    </span>
  )
}

function TelegramStatusBadge({ tone }: Readonly<{ tone: TelegramCardTone }>) {
  return (
    <div
      className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
      style={{
        backgroundColor: `${tone.accent}12`,
        borderColor: `${tone.accent}33`,
        color: tone.accent,
      }}
    >
      {tone.label}
    </div>
  )
}

function TelegramInfoGrid({ controller }: Readonly<{ controller: TelegramIntegrationCardController }>) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <InfoColumn hint="Bot público usado para vínculo e leitura de alertas." label="Bot" value={controller.botValue} />
      <InfoColumn
        hint="Quando disponível, o portal gera um link temporário de 10 minutos."
        label="Vínculo"
        value={controller.linkStatusValue}
      />
      <InfoColumn hint={controller.chatHint} label="Chat" value={controller.chatValue} />
    </div>
  )
}

function TelegramOfficialNotice() {
  return (
    <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <p className="text-sm font-semibold text-[var(--text-primary)]">Canal oficial único.</p>
      <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
        O Telegram do Desk Imperial é definido no servidor e permanece fixo no portal. O usuário só vincula este chat ao
        bot oficial; não existe troca manual para outro bot.
      </p>
    </div>
  )
}

function TelegramActions({ controller }: Readonly<{ controller: TelegramIntegrationCardController }>) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Button
        disabled={!controller.canCreateLink}
        loading={controller.isCreateLinkPending}
        size="sm"
        type="button"
        variant="primary"
        onClick={controller.createLink}
      >
        <CheckCircle2 className="size-4" />
        {controller.primaryButtonLabel}
      </Button>
      <Button
        loading={controller.isRefreshPending}
        size="sm"
        type="button"
        variant="secondary"
        onClick={controller.refreshStatus}
      >
        <RefreshCw className="size-4" />
        Atualizar status
      </Button>
      {controller.status?.linked ? <UnlinkButton controller={controller} /> : null}
      {controller.botLink ? <OpenBotButton controller={controller} /> : null}
    </div>
  )
}

function UnlinkButton({ controller }: Readonly<{ controller: TelegramIntegrationCardController }>) {
  return (
    <Button loading={controller.isUnlinkPending} size="sm" type="button" variant="ghost" onClick={controller.unlink}>
      <Link2Off className="size-4" />
      Desvincular
    </Button>
  )
}

function OpenBotButton({ controller }: Readonly<{ controller: TelegramIntegrationCardController }>) {
  return (
    <Button size="sm" type="button" variant="ghost" onClick={controller.openBot}>
      <ExternalLink className="size-4" />
      Abrir @{controller.status?.botUsername}
    </Button>
  )
}
