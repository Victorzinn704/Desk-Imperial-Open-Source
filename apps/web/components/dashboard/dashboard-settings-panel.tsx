'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import type { ProfileFormValues } from '@/lib/validation'
import { type AuthUser, type CookiePreferencePayload, type CookiePreferences, fetchActivityFeed } from '@/lib/api'
import { LAB_RESPONSIVE_FOUR_UP_GRID, LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { cn } from '@/lib/utils'
import {
  type DashboardSectionId,
  dashboardSettingsNav,
  type DashboardSettingsSectionId,
} from '@/components/dashboard/dashboard-navigation'
import { Button } from '@/components/shared/button'

// Imports from extracted settings module
import { useWorkspacePreferences } from './settings/hooks/use-workspace-preferences'
import { SettingsMetric } from './settings/components/settings-metric'
import { AccountTab } from './settings/tabs/account-tab'
import { SecurityTab } from './settings/tabs/security-tab'
import { PreferencesTab } from './settings/tabs/preferences-tab'
import { ComplianceTab } from './settings/tabs/compliance-tab'
import { SessionTab } from './settings/tabs/session-tab'

type DashboardSettingsPanelProps = {
  activeTab: DashboardSettingsSectionId
  consentQueryIsLoading: boolean
  cookiePreferences: CookiePreferences
  documentTitles: Map<string, string>
  legalAcceptances: Array<{
    key: string
    acceptedAt: string
  }>
  logoutBusy: boolean
  onLogout: () => void
  onNavigateSection: (sectionId: DashboardSectionId) => void
  onProfileSubmit: (values: ProfileFormValues) => void
  onTabChange: (tab: DashboardSettingsSectionId) => void
  preferenceMutation: {
    error: unknown
    isPending: boolean
    mutate: (payload: CookiePreferencePayload) => void
  }
  presentation?: 'legacy' | 'lab'
  profileError?: string | null
  profileLoading?: boolean
  user: AuthUser
}

export function DashboardSettingsPanel({
  activeTab,
  consentQueryIsLoading,
  cookiePreferences,
  documentTitles,
  legalAcceptances,
  logoutBusy,
  onLogout,
  onNavigateSection,
  onProfileSubmit,
  onTabChange,
  preferenceMutation,
  presentation = 'legacy',
  profileError,
  profileLoading,
  user,
}: Readonly<DashboardSettingsPanelProps>) {
  const activityQuery = useQuery({
    queryKey: ['auth', 'activity-feed'],
    queryFn: fetchActivityFeed,
    staleTime: 30_000,
  })

  const [workspacePreferences, setWorkspacePreferences] = useWorkspacePreferences()

  const acceptedCount = legalAcceptances.length
  const companyLocation = useMemo(() => formatCompanyLocation(user), [user])
  const activeTabMeta = dashboardSettingsNav.find((tab) => tab.id === activeTab) ?? dashboardSettingsNav[0]
  const enabledCookiePreferences = Number(Boolean(cookiePreferences?.analytics)) + Number(Boolean(cookiePreferences?.marketing))

  const renderedTabContent =
    activeTab === 'account' ? (
      <AccountTab
        profileError={profileError}
        profileLoading={profileLoading}
        user={user}
        onProfileSubmit={onProfileSubmit}
      />
    ) : activeTab === 'security' ? (
      <SecurityTab
        activity={activityQuery.data ?? []}
        activityError={activityQuery.error instanceof Error ? activityQuery.error.message : null}
        activityLoading={activityQuery.isLoading}
      />
    ) : activeTab === 'preferences' ? (
      <PreferencesTab
        preferences={workspacePreferences}
        onNavigateSection={onNavigateSection}
        onPreferencesChange={setWorkspacePreferences}
      />
    ) : activeTab === 'compliance' ? (
      <ComplianceTab
        consentQueryIsLoading={consentQueryIsLoading}
        cookiePreferences={cookiePreferences}
        documentTitles={documentTitles}
        legalAcceptances={legalAcceptances}
        preferenceMutation={preferenceMutation}
      />
    ) : (
      <SessionTab
        activity={activityQuery.data ?? []}
        activityError={activityQuery.error instanceof Error ? activityQuery.error.message : null}
        activityLoading={activityQuery.isLoading}
        logoutBusy={logoutBusy}
        user={user}
        onLogout={onLogout}
      />
    )

  if (presentation === 'lab') {
    return (
      <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
        <div className="xl:sticky xl:top-0">
          <LabPanel padding="sm" subtitle="Ajustes centrais do workspace num fluxo mais seco e direto." title="Config">
            <div className="space-y-2">
              {dashboardSettingsNav.map((tab) => {
                const Icon = tab.icon
                const isActive = tab.id === activeTab

                return (
                  <button
                    className={cn(
                      'w-full rounded-xl px-3 py-3 text-left transition-colors',
                      isActive
                        ? 'bg-[var(--lab-blue-soft)]'
                        : 'hover:bg-[var(--lab-surface-hover)]',
                    )}
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl border',
                          isActive
                            ? 'border-[var(--lab-blue-border)] bg-[var(--lab-surface)] text-[var(--lab-blue)]'
                            : 'border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-fg-soft)]',
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--lab-fg)]">{tab.label}</span>
                          {isActive ? (
                            <LabStatusPill size="sm" tone="info">
                              ativa
                            </LabStatusPill>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[var(--lab-fg-soft)]">{tab.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 border-t border-[var(--lab-border)] pt-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">
                Comandos
              </p>
              <div className="mt-3 grid gap-2">
                <Button
                  fullWidth
                  type="button"
                  variant={activeTab === 'account' ? 'primary' : 'secondary'}
                  onClick={() => onTabChange('account')}
                >
                  Revisar conta
                </Button>
                <Button
                  fullWidth
                  type="button"
                  variant={activeTab === 'security' ? 'primary' : 'secondary'}
                  onClick={() => onTabChange('security')}
                >
                  Revisar segurança
                </Button>
                <Button
                  fullWidth
                  type="button"
                  variant={activeTab === 'compliance' ? 'primary' : 'secondary'}
                  onClick={() => onTabChange('compliance')}
                >
                  Rever consentimento
                </Button>
                <Button fullWidth loading={logoutBusy} type="button" variant="ghost" onClick={onLogout}>
                  <LogOut className="size-4" />
                  Encerrar sessão
                </Button>
              </div>
            </div>

            <div className="mt-5 border-t border-[var(--lab-border)] pt-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">
                Leitura rápida
              </p>
              <div className="mt-3">
                <SettingSignal
                  first
                  label="Perfil"
                  note={user.email}
                  value={user.role === 'OWNER' ? 'Administrador' : 'Operacional'}
                />
                <SettingSignal
                  label="Aceites"
                  note="documentos registrados"
                  value={`${acceptedCount}`}
                  valueTone={acceptedCount > 0 ? 'text-[var(--lab-fg)]' : 'text-[var(--lab-fg-muted)]'}
                />
                <SettingSignal
                  label="Cookies opcionais"
                  note="preferências ativas"
                  value={`${enabledCookiePreferences}/2`}
                />
                <SettingSignal
                  label="Local"
                  note={companyLocation.helper}
                  value={companyLocation.label}
                  valueTone={
                    companyLocation.label === 'Endereço não informado'
                      ? 'text-[var(--lab-fg-muted)]'
                      : 'text-[var(--lab-fg)]'
                  }
                />
              </div>
            </div>
          </LabPanel>
        </div>

        <div className="space-y-6">
          <div className="space-y-4 border-b border-[var(--lab-border)] pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">
                  Área ativa
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-[var(--lab-fg)]">{activeTabMeta.label}</h2>
                  <LabStatusPill size="sm" tone="info">
                    fluxo principal
                  </LabStatusPill>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-[var(--lab-fg-soft)]">{activeTabMeta.description}</p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[var(--lab-border)] lg:min-w-[360px]">
                <div className="grid sm:grid-cols-2">
                  <SettingSummaryCard
                    helper="Responsável atual da conta"
                    label="Conta"
                    value={user.companyName || user.fullName}
                  />
                  <SettingSummaryCard
                    helper="Período salvo neste dispositivo"
                    label="Período padrão"
                    value={workspacePreferences.defaultPeriod}
                  />
                </div>
              </div>
            </div>
          </div>

          {renderedTabContent}
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      {/* Métricas de contexto */}
      <div className={`grid gap-4 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
        <SettingsMetric helper={user.email} label="Conta" value={user.companyName || user.fullName} />
        <SettingsMetric
          helper={user.role === 'OWNER' ? 'Controle administrativo completo' : 'Acesso operacional com auditoria'}
          label="Perfil"
          value={user.role === 'OWNER' ? 'Administrador' : 'Operacional'}
        />
        <SettingsMetric helper="aceites registrados" label="Conformidade" value={String(acceptedCount)} />
        <SettingsMetric helper={companyLocation.helper} label="Local" value={companyLocation.label} />
      </div>

      {/* Tab bar horizontal — sem sidebar interna */}
      <div className="border-b border-[var(--border)]">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {dashboardSettingsNav.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                className={cn(
                  'relative shrink-0 px-5 py-3.5 text-sm font-semibold transition-colors duration-150',
                  isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-soft)] hover:text-[var(--text-primary)]',
                )}
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-[var(--accent)]" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Conteúdo em largura total */}
      <div className="space-y-6">{renderedTabContent}</div>
    </section>
  )
}

// ── Internal helpers (not extracted — specific to this component) ────────────

function formatCompanyLocation(user: AuthUser) {
  const addressParts = [
    user.companyLocation.streetLine1,
    user.companyLocation.streetNumber,
    user.companyLocation.city,
    user.companyLocation.state,
  ].filter(Boolean)

  return {
    helper: user.companyLocation.postalCode
      ? `CEP ${user.companyLocation.postalCode}`
      : 'Complete a localização para manter cadastro e atendimento consistentes',
    label: addressParts.length ? addressParts.join(', ') : 'Endereço não informado',
  }
}

function SettingSignal({
  first = false,
  label,
  value,
  note,
  valueTone = 'text-[var(--lab-fg)]',
}: Readonly<{
  first?: boolean
  label: string
  value: string
  note?: string
  valueTone?: string
}>) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-t border-[var(--lab-border)] py-3', first && 'border-t-0 pt-0')}>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{label}</p>
        {note ? <p className="mt-1 text-xs leading-5 text-[var(--lab-fg-soft)]">{note}</p> : null}
      </div>
      <p className={cn('max-w-[48%] break-words text-right text-sm font-semibold leading-5', valueTone)}>{value}</p>
    </div>
  )
}

function SettingSummaryCard({
  label,
  value,
  helper,
}: Readonly<{
  label: string
  value: string
  helper: string
}>) {
  return (
    <div className="px-4 py-3 first:border-b first:border-[var(--lab-border)] sm:first:border-b-0 sm:first:border-r sm:first:border-[var(--lab-border)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-5 text-[var(--lab-fg)]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--lab-fg-soft)]">{helper}</p>
    </div>
  )
}
