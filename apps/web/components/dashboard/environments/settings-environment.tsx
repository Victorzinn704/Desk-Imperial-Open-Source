'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Cog } from 'lucide-react'
import { ApiError } from '@/lib/api'
import type { ProfileFormValues } from '@/lib/validation'
import {
  LAB_RESPONSIVE_FOUR_UP_GRID,
  LabFactPill,
  LabMiniStat,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import {
  dashboardSettingsNav,
  type DashboardSectionId,
  type DashboardSettingsSectionId,
} from '@/components/dashboard/dashboard-navigation'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { DashboardSettingsPanel } from '@/components/dashboard/dashboard-settings-panel'

type SettingsEnvironmentProps = {
  activeSettingsSection: DashboardSettingsSectionId
  onNavigateSection: (sectionId: DashboardSectionId) => void
  onSettingsSectionChange: (sectionId: DashboardSettingsSectionId) => void
  presentation?: 'legacy' | 'lab'
}

export function SettingsEnvironment({
  activeSettingsSection,
  onNavigateSection,
  onSettingsSectionChange,
  presentation = 'legacy',
}: Readonly<SettingsEnvironmentProps>) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const { sessionQuery, consentQuery } = useDashboardQueries({ section: 'settings' })
  const { logoutMutation: _logoutMutation, preferenceMutation, updateProfileMutation } = useDashboardMutations()

  const user = sessionQuery.data?.user

  if (!user) {
    return <SettingsLockedState error={sessionQuery.error instanceof ApiError ? sessionQuery.error : null} />
  }

  const cookiePreferences = consentQuery.data?.cookiePreferences ?? user.cookiePreferences
  const legalAcceptances = consentQuery.data?.legalAcceptances ?? []
  const documentTitles = new Map(consentQuery.data?.documents.map((doc) => [doc.key, doc.title]) ?? [])
  const profileMutationError = updateProfileMutation.error instanceof ApiError ? updateProfileMutation.error : undefined
  const enabledCookiePreferences = Number(Boolean(cookiePreferences?.analytics)) + Number(Boolean(cookiePreferences?.marketing))

  const handleLogout = () => {
    _logoutMutation.mutate(undefined, {
      onSuccess: () => startTransition(() => router.push('/login')),
    })
  }

  const handleProfileSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values)
  }

  const activeTabLabel =
    {
      account: 'Conta',
      security: 'Segurança',
      preferences: 'Preferências',
      compliance: 'Compliance',
      session: 'Sessão',
    }[activeSettingsSection] ?? 'Conta'
  const activeTabDescription =
    dashboardSettingsNav.find((item) => item.id === activeSettingsSection)?.description ??
    'Ajustes centrais da conta e do workspace.'

  return (
    <section className="space-y-6">
      {presentation === 'lab' ? (
        <LabPageHeader
          description="Conta, segurança, preferências e conformidade do workspace num fluxo mais direto."
          eyebrow="Conta e governança"
          meta={
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3">
                <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">aba ativa</span>
                <LabStatusPill tone="info">{activeTabLabel}</LabStatusPill>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">perfil</span>
                <span className="text-sm font-medium text-[var(--lab-fg)]">{user.fullName}</span>
              </div>
              <p className="text-xs leading-5 text-[var(--lab-fg-soft)]">{activeTabDescription}</p>
            </div>
          }
          title="Configuração do workspace"
        >
          <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
            <LabMiniStat label="aba ativa" value={activeTabLabel} />
            <LabMiniStat label="aceites" value={String(legalAcceptances.length)} />
            <LabMiniStat label="cookies opcionais" value={`${enabledCookiePreferences}/2`} />
          </div>
        </LabPageHeader>
      ) : (
        <DashboardSectionHeading
          description="Conta, segurança e conformidade."
          eyebrow="Conta e governança"
          icon={Cog}
          title="Configurações do workspace"
        />
      )}

      <DashboardSettingsPanel
        activeTab={activeSettingsSection}
        consentQueryIsLoading={consentQuery.isLoading}
        cookiePreferences={cookiePreferences}
        documentTitles={documentTitles}
        legalAcceptances={legalAcceptances}
        logoutBusy={_logoutMutation.isPending}
        preferenceMutation={preferenceMutation}
        profileError={profileMutationError?.message}
        profileLoading={updateProfileMutation.isPending}
        presentation={presentation}
        user={user}
        onLogout={handleLogout}
        onNavigateSection={onNavigateSection}
        onProfileSubmit={handleProfileSubmit}
        onTabChange={onSettingsSectionChange}
      />
    </section>
  )
}

function SettingsLockedState({ error }: Readonly<{ error: ApiError | null }>) {
  const accessMessage = resolveSettingsAccessMessage(error)

  return (
    <section className="space-y-6">
      <LabPageHeader
        description="Conta, segurança, preferências e conformidade do workspace num fluxo mais direto."
        eyebrow="Conta e governança"
        meta={
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">sessão</span>
              <LabStatusPill tone="warning">entrar</LabStatusPill>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">módulo</span>
              <LabStatusPill tone="info">config</LabStatusPill>
            </div>
            <p className="text-xs leading-5 text-[var(--lab-fg-soft)]">{accessMessage}</p>
          </div>
        }
        title="Configuração do workspace"
      >
        <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
          <LabMiniStat label="áreas" value="5" />
          <LabMiniStat label="cookies opcionais" value="2" />
          <LabMiniStat label="aceites" value="2" />
          <LabMiniStat label="sessão" value="login" />
        </div>
      </LabPageHeader>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <LabPanel
          action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
          padding="md"
          title="Prévia travada das configurações"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <LabFactPill label="conta" value="perfil + workspace" />
              <LabFactPill label="segurança" value="atividade + sessão" />
              <LabFactPill label="cookies" value="preferências" />
              <LabFactPill label="escopo" value="governança" />
            </div>

            <div className="space-y-0">
              <LabSignalRow
                label="conta"
                note="perfil, email e identidade do workspace voltam a abrir no mesmo painel"
                tone="info"
                value="ao entrar"
              />
              <LabSignalRow
                label="segurança"
                note="atividade, sessão, senha e proteção de acesso reaparecem com histórico"
                tone="warning"
                value="bloqueada"
              />
              <LabSignalRow
                label="preferências"
                note="tema, período e navegação deixam de ficar em modo somente leitura"
                tone="neutral"
                value="pendente"
              />
              <LabSignalRow
                label="compliance"
                note="cookies, aceites e registro legal voltam a responder à sessão ativa"
                tone="success"
                value="pronto"
              />
            </div>

            <div className="pt-1">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
                href="/login"
              >
                Entrar para liberar config
              </Link>
            </div>
          </div>
        </LabPanel>

        <LabPanel
          action={<LabStatusPill tone="info">preview</LabStatusPill>}
          padding="md"
          title="O que abre em config"
        >
          <div className="space-y-0">
            <LabSignalRow label="perfil" note="nome, email e dados centrais do workspace" tone="neutral" value="sim" />
            <LabSignalRow label="segurança" note="atividade recente, senha e leitura de sessão" tone="success" value="sim" />
            <LabSignalRow label="preferências" note="tema, navegação e recortes persistidos" tone="info" value="sim" />
            <LabSignalRow label="compliance" note="cookies, aceites legais e registro do consentimento" tone="warning" value="sim" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <LabFactPill label="próximo passo" value="entrar no Desk" />
            <LabFactPill label="modo" value="somente leitura" />
            <LabFactPill label="mensagem" value={error?.status === 0 ? 'api offline' : 'sessão expirada'} />
          </div>
        </LabPanel>
      </div>
    </section>
  )
}

function resolveSettingsAccessMessage(error: ApiError | null) {
  if (!error) {
    return 'Faça login para abrir as configurações do workspace.'
  }

  if (error.status === 0) {
    return 'As configurações não abriram porque a API local não respondeu. Verifique se o backend está ativo em http://localhost:4000.'
  }

  if (error.status === 401) {
    return 'Sua sessão expirou. Entre novamente para abrir conta, segurança e compliance.'
  }

  return `Não foi possível abrir as configurações agora. ${error.message}`
}
