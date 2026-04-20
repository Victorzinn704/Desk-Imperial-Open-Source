'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Cog } from 'lucide-react'
import { ApiError } from '@/lib/api'
import type { ProfileFormValues } from '@/lib/validation'
import { LabMiniStat, LabPageHeader, LabStatusPill } from '@/components/design-lab/lab-primitives'
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

  if (!user) {return null}

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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
