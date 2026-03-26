'use client'

import Link from 'next/link'
import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  CalendarRange,
  KeyRound,
  Lock,
  LogOut,
  Monitor,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react'
import type { ProfileFormValues } from '@/lib/validation'
import {
  ApiError,
  fetchLastLogins,
  type AuthUser,
  type CookiePreferencePayload,
  type CookiePreferences,
  type LastLoginEntry,
} from '@/lib/api'
import { removeAdminPin, setupAdminPin } from '@/lib/admin-pin'
import { formatAccountStatus } from '@/lib/dashboard-format'
import { cn } from '@/lib/utils'
import { AccountProfileCard } from '@/components/dashboard/account-profile-card'
import {
  dashboardSettingsNav,
  type DashboardSectionId,
  type DashboardSettingsSectionId,
} from '@/components/dashboard/dashboard-navigation'
import { CheckboxField } from '@/components/shared/checkbox-field'
import { Button } from '@/components/shared/button'
import { SelectField } from '@/components/shared/select-field'

const SETTINGS_PREFS_KEY = 'desk_imperial_workspace_preferences'

const periodOptions = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
]

type WorkspacePreferences = {
  defaultPeriod: string
  executiveModules: {
    revenue: boolean
    operations: boolean
    map: boolean
    team: boolean
  }
}

const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  defaultPeriod: '30',
  executiveModules: {
    revenue: true,
    operations: true,
    map: true,
    team: true,
  },
}

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
  profileError,
  profileLoading,
  user,
}: Readonly<DashboardSettingsPanelProps>) {
  const activityQuery = useQuery({
    queryKey: ['auth', 'activity'],
    queryFn: fetchLastLogins,
    staleTime: 5 * 60 * 1000,
  })

  const [workspacePreferences, setWorkspacePreferences] = useState<WorkspacePreferences>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_WORKSPACE_PREFERENCES
    }

    const saved = window.localStorage.getItem(SETTINGS_PREFS_KEY)
    if (!saved) {
      return DEFAULT_WORKSPACE_PREFERENCES
    }

    try {
      const parsed = JSON.parse(saved) as Partial<WorkspacePreferences>
      return {
        defaultPeriod: parsed.defaultPeriod ?? DEFAULT_WORKSPACE_PREFERENCES.defaultPeriod,
        executiveModules: {
          ...DEFAULT_WORKSPACE_PREFERENCES.executiveModules,
          ...parsed.executiveModules,
        },
      }
    } catch {
      window.localStorage.removeItem(SETTINGS_PREFS_KEY)
      return DEFAULT_WORKSPACE_PREFERENCES
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(workspacePreferences))
  }, [workspacePreferences])

  const acceptedCount = legalAcceptances.length
  const companyLocation = useMemo(() => formatCompanyLocation(user), [user])

  return (
    <section className="space-y-6">
      {/* Métricas de contexto */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      <div className="border-b border-white/[0.06]">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {dashboardSettingsNav.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'relative shrink-0 px-5 py-3.5 text-sm font-semibold transition-colors duration-150',
                  isActive
                    ? 'text-white'
                    : 'text-[var(--text-soft)] hover:text-white',
                )}
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
      <div className="space-y-6">
          {activeTab === 'account' ? (
            <AccountTab
              profileError={profileError}
              profileLoading={profileLoading}
              user={user}
              onProfileSubmit={onProfileSubmit}
            />
          ) : null}

          {activeTab === 'security' ? (
            <SecurityTab
              activity={activityQuery.data ?? []}
              activityError={activityQuery.error instanceof Error ? activityQuery.error.message : null}
              activityLoading={activityQuery.isLoading}
            />
          ) : null}

          {activeTab === 'preferences' ? (
            <PreferencesTab
              preferences={workspacePreferences}
              onNavigateSection={onNavigateSection}
              onPreferencesChange={setWorkspacePreferences}
            />
          ) : null}

          {activeTab === 'compliance' ? (
            <ComplianceTab
              consentQueryIsLoading={consentQueryIsLoading}
              cookiePreferences={cookiePreferences}
              documentTitles={documentTitles}
              legalAcceptances={legalAcceptances}
              preferenceMutation={preferenceMutation}
            />
          ) : null}

          {activeTab === 'session' ? (
            <SessionTab
              activity={activityQuery.data ?? []}
              activityError={activityQuery.error instanceof Error ? activityQuery.error.message : null}
              activityLoading={activityQuery.isLoading}
              logoutBusy={logoutBusy}
              user={user}
              onLogout={onLogout}
            />
          ) : null}
        </div>
    </section>
  )
}

function AccountTab({
  profileError,
  profileLoading,
  user,
  onProfileSubmit,
}: Readonly<{
  profileError?: string | null
  profileLoading?: boolean
  user: AuthUser
  onProfileSubmit: (values: ProfileFormValues) => void
}>) {
  const companyLocation = formatCompanyLocation(user)

  return (
    <>
      <article className="imperial-card p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(195,164,111,0.18)] bg-[rgba(195,164,111,0.08)] text-[var(--accent)]">
            <UserRound className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Conta e identidade
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Dados principais da operação</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              Nome da empresa, responsável e moeda principal passam a ser geridos dentro do mesmo ambiente do dashboard.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <SettingsInfoCard hint="Identidade principal da conta" label="Responsável" value={user.fullName} />
          <SettingsInfoCard hint="Identificador seguro de acesso" label="Email" value={user.email} />
          <SettingsInfoCard hint={companyLocation.helper} label="Localização" value={companyLocation.label} />
        </div>
      </article>

      <AccountProfileCard error={profileError} loading={profileLoading} onSubmit={onProfileSubmit} user={user} />
    </>
  )
}

function SecurityTab({
  activity,
  activityError,
  activityLoading,
}: Readonly<{
  activity: LastLoginEntry[]
  activityError: string | null
  activityLoading: boolean
}>) {
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [pinSaved, setPinSaved] = useState(false)
  const [pinSaving, setPinSaving] = useState(false)
  const [pinSaveError, setPinSaveError] = useState('')
  const [pinActive, setPinActive] = useState(false)
  const [showConfirmRemove, setShowConfirmRemove] = useState(false)
  const [confirmRemoveDigits, setConfirmRemoveDigits] = useState(['', '', '', ''])
  const [confirmRemoveError, setConfirmRemoveError] = useState('')
  const [removeBlocked, setRemoveBlocked] = useState(false)
  const [removeSecondsLeft, setRemoveSecondsLeft] = useState(0)
  const [removing, setRemoving] = useState(false)
  const removeInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => {
    if (!removeBlocked || removeSecondsLeft <= 0) {
      return
    }

    const intervalId = window.setInterval(() => {
      setRemoveSecondsLeft((current) => {
        const next = current - 1
        if (next <= 0) {
          window.clearInterval(intervalId)
          setRemoveBlocked(false)
          return 0
        }

        return next
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [removeBlocked, removeSecondsLeft])

  async function handleSavePin() {
    const pin = pinDigits.join('')
    if (pin.length !== 4) {
      return
    }

    setPinSaving(true)
    setPinSaveError('')

    try {
      await setupAdminPin(pin)
      setPinSaved(true)
      setPinActive(true)
      setPinDigits(['', '', '', ''])
      window.setTimeout(() => setPinSaved(false), 2600)
    } catch (error) {
      setPinSaveError(error instanceof ApiError ? error.message : 'Nao foi possivel ativar o PIN agora.')
    } finally {
      setPinSaving(false)
    }
  }

  async function attemptRemovePin(pin: string) {
    setRemoving(true)

    try {
      await removeAdminPin(pin)
      setPinActive(false)
      setShowConfirmRemove(false)
      setConfirmRemoveDigits(['', '', '', ''])
      setConfirmRemoveError('')
    } catch (error) {
      setConfirmRemoveDigits(['', '', '', ''])

      if (error instanceof ApiError) {
        if (error.status === 423) {
          const match = error.message.match(/(\d+)\s*s/i)
          setRemoveBlocked(true)
          setRemoveSecondsLeft(match ? Number(match[1]) : 300)
        } else {
          setConfirmRemoveError(error.message || 'PIN incorreto. Tente novamente.')
          window.setTimeout(() => removeInputRefs[0].current?.focus(), 50)
        }
      } else {
        setConfirmRemoveError('Erro inesperado ao remover o PIN.')
      }
    } finally {
      setRemoving(false)
    }
  }

  async function handleConfirmRemoveDigitChange(index: number, rawValue: string) {
    const value = rawValue.replace(/\D/g, '').slice(-1)
    const next = [...confirmRemoveDigits]
    next[index] = value
    setConfirmRemoveDigits(next)
    setConfirmRemoveError('')

    if (value && index < 3) {
      removeInputRefs[index + 1].current?.focus()
    }

    if (value && next.every((digit) => digit !== '')) {
      await attemptRemovePin(next.join(''))
    }
  }

  return (
    <>
      <article className="imperial-card p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <Lock className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">
              Segurança operacional
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Proteção das ações críticas</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              O PIN administrativo segue como confirmação curta para desconto elevado, exclusão e ajustes sensíveis do workspace.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <article className="imperial-card p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
              <KeyRound className="size-5" />
            </span>
            <div>
              <p className="text-sm text-[var(--text-soft)]">PIN administrativo</p>
              <h3 className="text-xl font-semibold text-white">Controle fino das ações sensíveis</h3>
            </div>
          </div>

          <div className="mt-6 rounded-[20px] border border-[rgba(52,242,127,0.14)] bg-[rgba(52,242,127,0.04)] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Estado atual</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                  {pinActive
                    ? 'O fluxo sensível do PDV está protegido por confirmação administrativa.'
                    : 'Ative o PIN para endurecer desconto, exclusão e ações críticas do ambiente.'}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                  pinActive
                    ? 'border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#8fffb9]'
                    : 'border border-white/8 bg-white/[0.03] text-[var(--text-soft)]',
                )}
              >
                <ShieldCheck className="size-3" />
                {pinActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            {!pinActive ? (
              <div className="mt-5 space-y-3">
                <fieldset>
                  <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Defina o PIN
                  </legend>
                  <div className="mt-3 flex gap-2">
                    {pinDigits.map((digit, index) => (
                      <input
                        aria-label={`Digito ${index + 1} do PIN`}
                        className="size-12 rounded-[12px] border border-white/10 bg-white/[0.04] text-center text-lg font-bold text-white outline-none focus:border-[rgba(52,242,127,0.35)] [appearance:textfield]"
                        disabled={pinSaving}
                        inputMode="numeric"
                        key={index}
                        maxLength={1}
                        type="password"
                        value={digit}
                        onChange={(event) => {
                          const value = event.target.value.replace(/\D/g, '').slice(-1)
                          const next = [...pinDigits]
                          next[index] = value
                          setPinDigits(next)
                          setPinSaveError('')
                        }}
                      />
                    ))}
                  </div>
                </fieldset>

                {pinSaveError ? <p className="text-xs text-[#fca5a5]">{pinSaveError}</p> : null}

                <Button
                  disabled={pinDigits.join('').length !== 4}
                  loading={pinSaving}
                  onClick={() => void handleSavePin()}
                  type="button"
                >
                  {pinSaved ? 'PIN ativado' : 'Ativar PIN'}
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {!showConfirmRemove ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-[var(--text-soft)]">O PIN está valendo para o fluxo sensível do workspace.</p>
                    <button
                      className="rounded-[12px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3 py-2 text-xs font-semibold text-[#fca5a5] transition hover:bg-[rgba(239,68,68,0.14)]"
                      type="button"
                      onClick={() => {
                        setShowConfirmRemove(true)
                        setConfirmRemoveDigits(['', '', '', ''])
                        setConfirmRemoveError('')
                        setRemoveBlocked(false)
                      }}
                    >
                      Remover PIN
                    </button>
                  </div>
                ) : (
                  <div className="rounded-[16px] border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.05)] p-4">
                    <p className="text-sm font-semibold text-white">Confirme o PIN atual para desativar</p>

                    {removeBlocked ? (
                      <div className="mt-4 rounded-[14px] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] px-4 py-4 text-center">
                        <ShieldAlert className="mx-auto mb-2 size-5 text-[#fca5a5]" />
                        <p className="text-sm font-semibold text-[#fca5a5]">Tentativas bloqueadas</p>
                        <p className="mt-2 text-2xl font-bold text-white">{formatCountdown(removeSecondsLeft)}</p>
                      </div>
                    ) : (
                      <>
                        <fieldset>
                          <legend className="sr-only">Confirmar PIN atual</legend>
                          <div className="mt-4 flex gap-2">
                            {confirmRemoveDigits.map((digit, index) => (
                              <input
                                aria-label={`Confirmacao do digito ${index + 1}`}
                                className="size-12 rounded-[12px] border border-white/10 bg-white/[0.03] text-center text-lg font-bold text-white outline-none focus:border-[rgba(239,68,68,0.35)] [appearance:textfield]"
                                disabled={removing}
                                inputMode="numeric"
                                key={index}
                                maxLength={1}
                                ref={removeInputRefs[index]}
                                type="password"
                                value={digit}
                                onChange={(event) => void handleConfirmRemoveDigitChange(index, event.target.value)}
                              />
                            ))}
                          </div>
                        </fieldset>
                        {confirmRemoveError ? <p className="mt-3 text-xs text-[#fca5a5]">{confirmRemoveError}</p> : null}
                      </>
                    )}

                    <button
                      className="mt-4 text-xs text-[var(--text-soft)] underline transition hover:text-white"
                      type="button"
                      onClick={() => {
                        setShowConfirmRemove(false)
                        setConfirmRemoveDigits(['', '', '', ''])
                        setConfirmRemoveError('')
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </article>

        <article className="imperial-card p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Recuperação e revisão
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Fluxo seguro da conta principal</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
            A troca definitiva de senha continua via validação segura por email enquanto o painel administrativo interno é endurecido.
          </p>

          <div className="mt-6">
            <Link href="/recuperar-senha">
              <Button fullWidth type="button" variant="secondary">
                Abrir recuperação por email
              </Button>
            </Link>
          </div>

          <div className="mt-6 border-t border-white/[0.06] pt-6">
            <p className="text-sm font-semibold text-white">Leitura recente</p>
            <RecentAccessSummary activity={activity} activityError={activityError} activityLoading={activityLoading} />
          </div>
        </article>
      </div>
    </>
  )
}

function PreferencesTab({
  preferences,
  onNavigateSection,
  onPreferencesChange,
}: Readonly<{
  preferences: WorkspacePreferences
  onNavigateSection: (sectionId: DashboardSectionId) => void
  onPreferencesChange: Dispatch<SetStateAction<WorkspacePreferences>>
}>) {
  return (
    <>
      <article className="imperial-card p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(195,164,111,0.18)] bg-[rgba(195,164,111,0.08)] text-[var(--accent)]">
            <Bell className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Preferências do workspace
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Leitura visual e rotina da operação</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              Essas preferências organizam o ambiente neste dispositivo sem interferir no núcleo crítico do sistema.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <article className="imperial-card p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Painéis com prioridade
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">O que fica mais visível na leitura executiva</h3>

          <div className="mt-6 grid gap-3">
            {([
              { key: 'revenue', label: 'Receita e financeiro' },
              { key: 'operations', label: 'Operação comercial' },
              { key: 'map', label: 'Mapa e território' },
              { key: 'team', label: 'Equipe e produtividade' },
            ] as const).map(({ key, label }) => (
              <CheckboxField
                checked={preferences.executiveModules[key]}
                description="Ajuste local salvo neste dispositivo para destacar o que mais importa na leitura do dashboard."
                key={key}
                label={label}
                onChange={(event) =>
                  onPreferencesChange((current) => ({
                    ...current,
                    executiveModules: {
                      ...current.executiveModules,
                      [key]: event.currentTarget.checked,
                    },
                  }))
                }
              />
            ))}
          </div>

          <div className="mt-6">
            <SelectField
              label="Período padrão"
              options={periodOptions}
              value={preferences.defaultPeriod}
              onChange={(event) =>
                onPreferencesChange((current) => ({
                  ...current,
                  defaultPeriod: event.target.value,
                }))
              }
            />
          </div>
        </article>

        <article className="imperial-card p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Agenda operacional
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Atalhos da rotina comercial</h3>
          <div className="mt-6 space-y-4">
            <SettingsInfoCard
              hint="A agenda comercial agora fica acessível como módulo dedicado do workspace."
              label="Calendário"
              value="Disponível"
            />
            <SettingsInfoCard
              hint="Essas preferências são locais e podem evoluir depois para persistência por conta."
              label="Persistência"
              value="Neste dispositivo"
            />
          </div>

          <div className="mt-6">
            <Button type="button" variant="secondary" onClick={() => onNavigateSection('calendario')}>
              <CalendarRange className="size-4" />
              Abrir calendário
            </Button>
          </div>
        </article>
      </div>
    </>
  )
}

function ComplianceTab({
  consentQueryIsLoading,
  cookiePreferences,
  documentTitles,
  legalAcceptances,
  preferenceMutation,
}: Readonly<{
  consentQueryIsLoading: boolean
  cookiePreferences: CookiePreferences
  documentTitles: Map<string, string>
  legalAcceptances: Array<{
    key: string
    acceptedAt: string
  }>
  preferenceMutation: DashboardSettingsPanelProps['preferenceMutation']
}>) {
  return (
    <>
      <article className="imperial-card p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">
              Governança e consentimento
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Conformidade integrada à central da conta</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              O bloco de conformidade deixa a navegação principal mais limpa e passa a viver onde a governança realmente faz sentido.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="imperial-card p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Documentos aceitos
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Histórico de consentimento</h3>

          <div className="mt-6 space-y-3">
            {legalAcceptances.length ? (
              legalAcceptances.map((acceptance) => (
                <SettingsInfoCard
                  hint={`Aceito em ${new Date(acceptance.acceptedAt).toLocaleString('pt-BR')}`}
                  key={acceptance.key}
                  label={documentTitles.get(acceptance.key) ?? acceptance.key}
                  value="Aceito"
                />
              ))
            ) : (
              <EmptyCard message="Os documentos aceitos aparecerão aqui assim que houver registros de consentimento." />
            )}
          </div>
        </article>

        <article className="imperial-card p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Preferências de cookies
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Controle de consentimento opcional</h3>

          <div className="mt-6 grid gap-3">
            <CheckboxField
              checked={cookiePreferences.analytics}
              description="Mede uso e desempenho do portal para leitura de produto e melhoria operacional."
              disabled={preferenceMutation.isPending || consentQueryIsLoading}
              label="Cookies analíticos"
              onChange={(event) =>
                preferenceMutation.mutate({
                  analytics: event.currentTarget.checked,
                  marketing: cookiePreferences.marketing,
                })
              }
            />
            <CheckboxField
              checked={cookiePreferences.marketing}
              description="Mantém a base pronta para comunicações futuras com consentimento controlado."
              disabled={preferenceMutation.isPending || consentQueryIsLoading}
              label="Cookies de marketing"
              onChange={(event) =>
                preferenceMutation.mutate({
                  analytics: cookiePreferences.analytics,
                  marketing: event.currentTarget.checked,
                })
              }
            />
          </div>

          {preferenceMutation.error instanceof Error ? (
            <p className="mt-4 text-sm text-[var(--danger)]">{preferenceMutation.error.message}</p>
          ) : null}
        </article>
      </div>
    </>
  )
}

function SessionTab({
  activity,
  activityError,
  activityLoading,
  logoutBusy,
  onLogout,
  user,
}: Readonly<{
  activity: LastLoginEntry[]
  activityError: string | null
  activityLoading: boolean
  logoutBusy: boolean
  onLogout: () => void
  user: AuthUser
}>) {
  return (
    <>
      <article className="imperial-card p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white">
            <LogOut className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Sessão e rastreabilidade
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Acessos recentes e controle da sessão ativa</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              Toda leitura relevante da conta passa por aqui: dispositivo, histórico recente e encerramento manual da sessão.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <article className="imperial-card p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Últimos acessos
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Leitura recente da conta</h3>
          <div className="mt-6">
            <RecentAccessList activity={activity} activityError={activityError} activityLoading={activityLoading} />
          </div>
        </article>

        <article className="imperial-card p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Sessão atual
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Encerramento seguro</h3>

          <div className="mt-6 space-y-4">
            <SettingsInfoCard hint="Conta autenticada neste dispositivo" label="Usuário" value={user.fullName} />
            <SettingsInfoCard hint="Escopo atual de acesso" label="Perfil" value={user.role === 'OWNER' ? 'Administrador' : 'Operacional'} />
            <SettingsInfoCard hint="Estado da identidade no portal" label="Status" value={formatAccountStatus(user.status)} />
          </div>

          <div className="mt-8">
            <Button fullWidth loading={logoutBusy} onClick={onLogout} type="button">
              <LogOut className="size-4" />
              Encerrar sessão
            </Button>
          </div>
        </article>
      </div>
    </>
  )
}

function RecentAccessSummary({
  activity,
  activityError,
  activityLoading,
}: Readonly<{
  activity: LastLoginEntry[]
  activityError: string | null
  activityLoading: boolean
}>) {
  if (activityLoading) {
    return <p className="mt-3 text-sm text-[var(--text-soft)]">Carregando histórico recente...</p>
  }

  if (activityError) {
    return <p className="mt-3 text-sm text-[var(--danger)]">{activityError}</p>
  }

  const latest = activity[0]
  if (!latest) {
    return <p className="mt-3 text-sm text-[var(--text-soft)]">Ainda não há acessos suficientes para leitura.</p>
  }

  return (
    <div className="mt-3 rounded-[14px] border border-white/8 bg-white/[0.02] px-4 py-4">
      <p className="text-sm font-semibold text-white">
        {latest.browser} em {latest.os}
      </p>
      <p className="mt-1 text-xs text-[var(--text-soft)]">
        {new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(latest.createdAt))}
      </p>
    </div>
  )
}

function RecentAccessList({
  activity,
  activityError,
  activityLoading,
}: Readonly<{
  activity: LastLoginEntry[]
  activityError: string | null
  activityLoading: boolean
}>) {
  if (activityLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="h-12 animate-pulse rounded-xl bg-white/[0.04]" key={index} />
        ))}
      </div>
    )
  }

  if (activityError) {
    return <p className="text-sm text-[var(--danger)]">{activityError}</p>
  }

  if (!activity.length) {
    return <EmptyCard message="Nenhum acesso recente foi registrado ainda." />
  }

  return (
    <div className="space-y-3">
      {activity.map((entry) => {
        const isMobileDevice = ['iPhone', 'iPad', 'Android'].includes(entry.os)
        return (
          <div
            className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-white/[0.02] px-4 py-3"
            key={entry.id}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.03] text-[var(--text-soft)]">
              {isMobileDevice ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {entry.browser} em {entry.os}
              </p>
              <p className="mt-1 truncate text-xs text-[var(--text-soft)]">
                {entry.ipAddress || 'IP protegido pelo ambiente'}
              </p>
            </div>

            <p className="shrink-0 text-xs text-[var(--text-soft)]">
              {new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(entry.createdAt))}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function SettingsMetric({
  helper,
  label,
  value,
}: Readonly<{
  helper: string
  label: string
  value: string
}>) {
  return (
    <div className="imperial-card-soft px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">{helper}</p>
    </div>
  )
}

function SettingsInfoCard({
  hint,
  label,
  value,
}: Readonly<{
  hint: string
  label: string
  value: string
}>) {
  return (
    <div className="imperial-card-soft p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}

function EmptyCard({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-[18px] border border-dashed border-white/8 bg-white/[0.02] px-5 py-8 text-center text-sm leading-7 text-[var(--text-soft)]">
      {message}
    </div>
  )
}

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
      : 'Complete a localização para alimentar mapa e operação',
    label: addressParts.length ? addressParts.join(', ') : 'Endereço não informado',
  }
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return minutes > 0
    ? `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
    : `${remainingSeconds}s`
}
