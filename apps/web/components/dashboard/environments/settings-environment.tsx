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
import type { DashboardSectionId, DashboardSettingsSectionId } from '@/components/dashboard/dashboard-navigation'
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

  const handleLogout = () => {
    _logoutMutation.mutate(undefined, {
      onSuccess: () => startTransition(() => router.push('/login')),
    })
  }

  const handleProfileSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values)
  }

  return (
    <section className="space-y-6">
      {presentation === 'lab' ? null : (
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
        presentation={presentation}
        profileError={profileMutationError?.message}
        profileLoading={updateProfileMutation.isPending}
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
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">sessão</span>
              <LabStatusPill tone="warning">login</LabStatusPill>
            </div>
            <p className="text-xs leading-5 text-[var(--lab-fg-soft)]">{accessMessage}</p>
          </div>
        }
        title="Configuração do workspace"
      >
        <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
          <LabMiniStat label="sessão" value="login" />
          <LabMiniStat label="bot oficial" value="@Desk_Imperial_bot" />
          <LabMiniStat label="modo" value="somente leitura" />
        </div>
      </LabPageHeader>

      <LabPanel
        action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
        padding="md"
        title="Configuração bloqueada"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <LabFactPill label="conta" value="perfil + workspace" />
            <LabFactPill label="segurança" value="sessão + atividade" />
            <LabFactPill label="telegram" value="@Desk_Imperial_bot" />
          </div>

          <div className="space-y-0">
            <LabSignalRow label="acesso" note={accessMessage} tone="warning" value="login" />
            <LabSignalRow
              label="preview"
              note="Sem sessão, a tela só mostra casca de navegação. Perfil, governança e integrações continuam fechados."
              tone="neutral"
              value="somente leitura"
            />
            <LabSignalRow
              label="bot oficial"
              note="O portal só vincula o bot definido no servidor. Não existe troca manual para outro Telegram."
              tone="info"
              value="@Desk_Imperial_bot"
            />
          </div>

          <div className="flex flex-col gap-4 rounded-[24px] border border-[var(--lab-border)] bg-[var(--lab-surface-2)] p-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--lab-fg)]">
                A configuração real abre no mesmo shell depois do login.
              </p>
              <p className="text-sm leading-6 text-[var(--lab-fg-soft)]">
                Entre no Desk para liberar conta, segurança, preferências, compliance e vínculo do Telegram oficial.
              </p>
            </div>
            <Link
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
              href="/login"
            >
              Entrar para liberar config
            </Link>
          </div>
        </div>
      </LabPanel>
    </section>
  )
}

function resolveSettingsAccessMessage(error: ApiError | null) {
  if (!error) {
    return 'Faça login para abrir as configurações do workspace.'
  }

  if (error.status === 0) {
    return 'As configurações não estão disponíveis no momento. Tente novamente em instantes.'
  }

  if (error.status === 401) {
    return 'Sua sessão expirou. Entre novamente para abrir conta, segurança e compliance.'
  }

  if (error.status === 404 || error.status >= 500) {
    return 'As configurações estão sincronizando no momento. Tente novamente em instantes.'
  }

  return 'Não foi possível abrir as configurações agora. Tente novamente em instantes.'
}
