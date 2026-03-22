'use client'

import Link from 'next/link'
import { createRef, useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Building2,
  Calendar,
  Clock3,
  Cog,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Monitor,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/shared/button'
import { fetchLastLogins, type LastLoginEntry } from '@/lib/api'
import { setupAdminPin, removeAdminPin } from '@/lib/admin-pin'
import { ApiError } from '@/lib/api'

type DayKey = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'

type DaySchedule = {
  enabled: boolean
  open: string
  close: string
}

const DAY_LABELS: Record<DayKey, string> = {
  seg: 'Seg',
  ter: 'Ter',
  qua: 'Qua',
  qui: 'Qui',
  sex: 'Sex',
  sab: 'Sáb',
  dom: 'Dom',
}

const INITIAL_SCHEDULE: Record<DayKey, DaySchedule> = {
  seg: { enabled: true, open: '09:00', close: '00:00' },
  ter: { enabled: true, open: '09:00', close: '00:00' },
  qua: { enabled: true, open: '09:00', close: '00:00' },
  qui: { enabled: true, open: '09:00', close: '00:00' },
  sex: { enabled: true, open: '16:00', close: '04:00' },
  sab: { enabled: true, open: '16:00', close: '04:00' },
  dom: { enabled: true, open: '16:00', close: '00:00' },
}

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [companyName, setCompanyName] = useState('Bar do Pedrão')
  const [email, setEmail] = useState('demo@deskimperial.online')
  const [schedule, setSchedule] = useState<Record<DayKey, DaySchedule>>(INITIAL_SCHEDULE)
  const [showPillars, setShowPillars] = useState({
    weekly: true,
    monthly: true,
    profit: true,
    event: true,
    normal: true,
  })
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [pinSaved, setPinSaved] = useState(false)
  const [pinSaving, setPinSaving] = useState(false)
  const [pinSaveError, setPinSaveError] = useState('')
  const [pinActive, setPinActive] = useState<boolean | null>(null)
  const [confirmRemoveDigits, setConfirmRemoveDigits] = useState(['', '', '', ''])
  const [confirmRemoveError, setConfirmRemoveError] = useState('')
  const [showConfirmRemove, setShowConfirmRemove] = useState(false)
  const [removeBlocked, setRemoveBlocked] = useState(false)
  const [removeSecondsLeft, setRemoveSecondsLeft] = useState(0)
  const [removing, setRemoving] = useState(false)
  const removeInputRefs = useRef([
    createRef<HTMLInputElement>(),
    createRef<HTMLInputElement>(),
    createRef<HTMLInputElement>(),
    createRef<HTMLInputElement>(),
  ]).current

  useEffect(() => {
    if (pinActive === null) {
      setPinActive(false)
    }
  }, [pinActive])

  useEffect(() => {
    if (!removeBlocked || removeSecondsLeft <= 0) return

    const id = window.setInterval(() => {
      setRemoveSecondsLeft((prev) => {
        const next = prev - 1
        if (next <= 0) {
          window.clearInterval(id)
          setRemoveBlocked(false)
          return 0
        }
        return next
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [removeBlocked, removeSecondsLeft])

  useEffect(() => {
    if (showConfirmRemove && !removeBlocked) {
      window.setTimeout(() => removeInputRefs[0].current?.focus(), 50)
    }
  }, [showConfirmRemove, removeBlocked, removeInputRefs])

  const activityQuery = useQuery({
    queryKey: ['auth', 'activity'],
    queryFn: fetchLastLogins,
    staleTime: 5 * 60 * 1000,
  })

  async function handleSavePin() {
    const pin = pinDigits.join('')
    if (pin.length !== 4) return

    setPinSaving(true)
    setPinSaveError('')

    try {
      await setupAdminPin(pin)
      setPinSaved(true)
      setPinActive(true)
      setPinDigits(['', '', '', ''])
      window.setTimeout(() => setPinSaved(false), 3000)
    } catch (err) {
      if (err instanceof ApiError) {
        setPinSaveError(err.message || 'Erro ao salvar o PIN. Tente novamente.')
      } else {
        setPinSaveError('Erro inesperado. Tente novamente.')
      }
    } finally {
      setPinSaving(false)
    }
  }

  async function handleConfirmRemoveDigitChange(i: number, rawValue: string) {
    const value = rawValue.replace(/\D/g, '').slice(-1)
    const next = [...confirmRemoveDigits]
    next[i] = value
    setConfirmRemoveDigits(next)
    setConfirmRemoveError('')

    if (value && i < 3) {
      removeInputRefs[i + 1].current?.focus()
    }

    if (next.every((digit) => digit !== '') && value) {
      await attemptRemovePin(next.join(''))
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
    } catch (err) {
      setConfirmRemoveDigits(['', '', '', ''])

      if (err instanceof ApiError) {
        if (err.status === 423) {
          const match = err.message.match(/(\d+)\s*s/i)
          const secs = match ? Number(match[1]) : 300
          setRemoveBlocked(true)
          setRemoveSecondsLeft(secs)
          setConfirmRemoveError('')
        } else if (err.status === 401) {
          setConfirmRemoveError(err.message || 'PIN incorreto. Tente novamente.')
          window.setTimeout(() => removeInputRefs[0].current?.focus(), 50)
        } else {
          setConfirmRemoveError(err.message || 'Erro ao remover o PIN. Tente novamente.')
          window.setTimeout(() => removeInputRefs[0].current?.focus(), 50)
        }
      } else {
        setConfirmRemoveError('Erro inesperado. Tente novamente.')
        window.setTimeout(() => removeInputRefs[0].current?.focus(), 50)
      }
    } finally {
      setRemoving(false)
    }
  }

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return minutes > 0 ? `${minutes}:${String(remainingSeconds).padStart(2, '0')}` : `${remainingSeconds}s`
  }

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      alert('As senhas não conferem')
      return
    }

    alert('Senha alterada com sucesso!')
    setNewPassword('')
    setConfirmPassword('')
  }

  const accessStats = [
    { label: 'Conta', value: companyName, hint: 'Nome exibido na plataforma' },
    { label: 'Email', value: email, hint: 'Identificador de acesso' },
    { label: 'PIN', value: pinActive ? 'Ativo' : 'Inativo', hint: 'Controle de ações sensíveis' },
    { label: 'Agenda', value: 'Operação em exibição', hint: 'Calendário comercial disponível' },
  ]

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="imperial-card relative overflow-hidden p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(195,164,111,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(90,149,196,0.08),transparent_26%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(195,164,111,0.18)] bg-[rgba(195,164,111,0.08)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                <Cog className="size-3.5" />
                Centro de controle
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Configurações com padrão executivo.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-soft)]">
                Ajuste conta, segurança, preferências e estabelecimento em uma interface mais densa, clara e
                compatível com um produto premium.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px] xl:grid-cols-2">
              {accessStats.map((item) => (
                <StatCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
              ))}
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SettingsCard
            description="Nome, contato e autenticação principal da conta."
            eyebrow="Conta"
            icon={Building2}
            title="Identidade da operação"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldGroup label="Nome do estabelecimento">
                <input
                  className="imperial-input"
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                />
              </FieldGroup>

              <FieldGroup label="Email">
                <input
                  className="imperial-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </FieldGroup>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
              <FieldGroup
                label="Nova senha"
                hint="Use uma senha forte para reduzir risco operacional e manter acesso mais seguro."
              >
                <div className="relative">
                  <input
                    className="imperial-input pr-12"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-transparent p-2 text-[var(--text-muted)] transition hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)] hover:text-white"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </FieldGroup>

              <Button className="self-end" onClick={handlePasswordChange} type="button">
                Atualizar conta
              </Button>
            </div>

            <FieldGroup label="Confirmar senha">
              <input
                className="imperial-input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </FieldGroup>
          </SettingsCard>

          <SettingsCard
            description="Proteção por PIN, MFA e histórico recente de sessões."
            eyebrow="Segurança"
            icon={ShieldCheck}
            title="Governança e acesso"
          >
            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/6 bg-[rgba(255,255,255,0.025)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(195,164,111,0.18)] bg-[rgba(195,164,111,0.08)] text-[var(--accent)]">
                      <Lock className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">MFA e PIN</p>
                      <p className="mt-1 text-sm leading-7 text-[var(--text-soft)]">
                        Ações sensíveis podem ser protegidas com PIN de administrador.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    MFA em breve
                  </span>
                </div>

                <div className="mt-5 rounded-[22px] border border-[rgba(52,242,127,0.14)] bg-[rgba(52,242,127,0.04)] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.14)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
                        <KeyRound className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">PIN de administrador</p>
                        <p className="mt-1 text-sm leading-7 text-[var(--text-soft)]">
                          Protege descontos, exclusões e ações críticas.
                        </p>
                      </div>
                    </div>
                    {pinActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.08)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">
                        <ShieldCheck className="size-3" />
                        Ativo
                      </span>
                    ) : null}
                  </div>

                  {!pinActive ? (
                    <div className="mt-5 space-y-4">
                      <PinDigitRow
                        disabled={pinSaving}
                        digits={pinDigits}
                        error={pinSaveError}
                        label="Crie um PIN de 4 dígitos"
                        onChange={(index, value) => {
                          const next = [...pinDigits]
                          next[index] = value.replace(/\D/g, '').slice(-1)
                          setPinDigits(next)
                          setPinSaveError('')
                        }}
                        onComplete={handleSavePin}
                        onResetError={() => setPinSaveError('')}
                      />
                      <Button
                        disabled={pinDigits.join('').length !== 4 || pinSaving}
                        type="button"
                        onClick={handleSavePin}
                      >
                        {pinSaving ? 'Salvando...' : pinSaved ? 'PIN salvo' : 'Ativar PIN'}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {!showConfirmRemove ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm leading-7 text-[var(--text-soft)]">
                            O PIN está ativo e protege os caminhos mais críticos do PDV.
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setShowConfirmRemove(true)
                              setConfirmRemoveError('')
                              setRemoveBlocked(false)
                            }}
                          >
                            Remover PIN
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 rounded-[22px] border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.05)] p-4">
                          <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-2xl border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.08)] text-[#fca5a5]">
                              <ShieldAlert className="size-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-white">Confirme o PIN atual</p>
                              <p className="mt-1 text-sm leading-7 text-[var(--text-soft)]">
                                Digite os 4 dígitos para desativar a proteção.
                              </p>
                            </div>
                          </div>

                          {removeBlocked ? (
                            <div className="rounded-[20px] border border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.08)] px-4 py-5 text-center">
                              <ShieldAlert className="mx-auto size-5 text-red-400" />
                              <p className="mt-3 text-sm font-semibold text-[#fca5a5]">Bloqueado temporariamente</p>
                              <p className="mt-2 text-2xl font-semibold text-white">{formatCountdown(removeSecondsLeft)}</p>
                              <p className="mt-1 text-xs text-[var(--text-soft)]">Aguarde para tentar novamente</p>
                            </div>
                          ) : (
                            <PinDigitRow
                              disabled={removing}
                              digits={confirmRemoveDigits}
                              error={confirmRemoveError}
                              label="Confirme o PIN"
                              onChange={handleConfirmRemoveDigitChange}
                              onComplete={(value) => attemptRemovePin(value)}
                              onResetError={() => setConfirmRemoveError('')}
                              refs={removeInputRefs}
                            />
                          )}

                          <button
                            className="text-sm text-[var(--text-soft)] underline transition hover:text-white"
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
              </div>

              <div className="rounded-[24px] border border-white/6 bg-[rgba(255,255,255,0.025)] p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(90,149,196,0.16)] bg-[rgba(90,149,196,0.08)] text-[var(--info)]">
                    <Clock3 className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Últimos acessos</p>
                    <p className="mt-1 text-sm leading-7 text-[var(--text-soft)]">
                      Histórico recente do ambiente para auditoria operacional.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {activityQuery.isLoading ? (
                    <LoadingRows />
                  ) : activityQuery.error ? (
                    <InlineNotice tone="danger" message="Não foi possível carregar o histórico." />
                  ) : activityQuery.data?.length === 0 ? (
                    <InlineNotice tone="muted" message="Nenhum acesso registrado ainda." />
                  ) : (
                    activityQuery.data?.map((entry) => <AccessRow entry={entry} key={entry.id} />)
                  )}
                </div>
              </div>
            </div>
          </SettingsCard>
        </section>

        <SettingsCard
          description="Controle o que o dashboard privilegia na leitura inicial e ajuste o período padrão."
          eyebrow="Preferências"
          icon={Bell}
          title="Prioridades do dashboard"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <ToggleRow
                checked={showPillars.weekly}
                label="Vendas semanal"
                onChange={(checked) => setShowPillars({ ...showPillars, weekly: checked })}
              />
              <ToggleRow
                checked={showPillars.monthly}
                label="Vendas mensal"
                onChange={(checked) => setShowPillars({ ...showPillars, monthly: checked })}
              />
              <ToggleRow
                checked={showPillars.profit}
                label="Lucro"
                onChange={(checked) => setShowPillars({ ...showPillars, profit: checked })}
              />
              <ToggleRow
                checked={showPillars.event}
                label="Desempenho em eventos"
                onChange={(checked) => setShowPillars({ ...showPillars, event: checked })}
              />
              <ToggleRow
                checked={showPillars.normal}
                label="Desempenho normal"
                onChange={(checked) => setShowPillars({ ...showPillars, normal: checked })}
              />
            </div>

            <div className="space-y-4">
              <FieldGroup label="Período padrão" hint="Esse intervalo orienta a leitura inicial das métricas.">
                <select className="imperial-input">
                  <option>7 dias</option>
                  <option>30 dias</option>
                  <option>90 dias</option>
                </select>
              </FieldGroup>

              <div className="rounded-[22px] border border-white/6 bg-[rgba(255,255,255,0.025)] p-4 text-sm leading-7 text-[var(--text-soft)]">
                <div className="flex items-center gap-3">
                  <Sparkles className="size-4 text-[var(--accent)]" />
                  <p className="font-semibold text-white">Leitura curta e rápida</p>
                </div>
                <p className="mt-3">
                  As preferências atuais preservam clareza sem poluir o painel com excesso de informação.
                </p>
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          description="Horário comercial e atalho para o calendário de atividades."
          eyebrow="Estabelecimento"
          icon={Building2}
          title="Rotina operacional"
        >
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Horário de funcionamento</p>
                  <p className="mt-1 text-sm leading-7 text-[var(--text-soft)]">
                    Estruture os dias úteis e finais de semana com um bloco visual claro.
                  </p>
                </div>
                <span className="rounded-full border border-[rgba(195,164,111,0.18)] bg-[rgba(195,164,111,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  Operação ativa
                </span>
              </div>

              <div className="space-y-2">
                {(Object.keys(DAY_LABELS) as DayKey[]).map((day) => {
                  const currentSchedule = schedule[day]

                  return (
                    <DayScheduleRow
                      key={day}
                      day={day}
                      schedule={currentSchedule}
                      onChange={(nextSchedule) => setSchedule({ ...schedule, [day]: nextSchedule })}
                    />
                  )
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-[rgba(52,242,127,0.14)] bg-[rgba(52,242,127,0.04)] p-5">
                <div className="flex items-center gap-3">
                  <Calendar className="size-4 text-[#36f57c]" />
                  <p className="text-sm font-semibold text-white">Calendário comercial</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  Planeje eventos, promoções e datas operacionais no módulo dedicado.
                </p>
                <Link className="mt-4 block" href="/dashboard">
                  <div className="flex items-center justify-between rounded-[18px] border border-[rgba(52,242,127,0.16)] bg-[rgba(52,242,127,0.05)] px-4 py-3 transition hover:bg-[rgba(52,242,127,0.08)]">
                    <div>
                      <p className="text-sm font-semibold text-white">Abrir calendário</p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">Atividades, datas e movimentos comerciais</p>
                    </div>
                    <span className="text-[#36f57c]">→</span>
                  </div>
                </Link>
              </div>

              <div className="rounded-[24px] border border-white/6 bg-[rgba(255,255,255,0.025)] p-5">
                <p className="text-sm font-semibold text-white">Leituras rápidas</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {accessStats.map((item) => (
                    <MiniInfoCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SettingsCard>
      </div>
    </main>
  )
}

function SettingsCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: Readonly<{
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  children: ReactNode
}>) {
  return (
    <article className="imperial-card overflow-hidden p-6 md:p-8">
      <div className="flex flex-col gap-4 border-b border-white/6 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">{eyebrow}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(195,164,111,0.18)] bg-[rgba(195,164,111,0.08)] text-[var(--accent)]">
              <Icon className="size-4" />
            </span>
            <h2 className="text-2xl font-semibold text-white md:text-[2rem]">{title}</h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{description}</p>
        </div>
      </div>

      <div className="mt-6 space-y-6">{children}</div>
    </article>
  )
}

function FieldGroup({
  label,
  hint,
  children,
}: Readonly<{
  label: string
  hint?: string
  children: ReactNode
}>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
      {children}
      {hint ? <p className="text-sm leading-7 text-[var(--text-soft)]">{hint}</p> : null}
    </label>
  )
}

function StatCard({
  label,
  value,
  hint,
}: Readonly<{
  label: string
  value: string
  hint: string
}>) {
  return (
    <div className="rounded-[22px] border border-white/6 bg-[rgba(255,255,255,0.025)] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-3 text-base font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}

function MiniInfoCard({
  label,
  value,
  hint,
}: Readonly<{
  label: string
  value: string
  hint: string
}>) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.025)] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-6 text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}

function ToggleRow({
  checked,
  label,
  onChange,
}: Readonly<{
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}>) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[22px] border border-white/6 bg-[rgba(255,255,255,0.025)] px-4 py-4">
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="relative inline-flex items-center">
        <input
          checked={checked}
          className="peer sr-only"
          type="checkbox"
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span className="h-6 w-11 rounded-full border border-white/8 bg-[rgba(255,255,255,0.08)] transition peer-checked:border-[rgba(52,242,127,0.28)] peer-checked:bg-[rgba(52,242,127,0.16)]" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5 peer-checked:bg-[#e8ffe9]" />
      </span>
    </label>
  )
}

function DayScheduleRow({
  day,
  schedule,
  onChange,
}: Readonly<{
  day: DayKey
  schedule: DaySchedule
  onChange: (schedule: DaySchedule) => void
}>) {
  return (
    <div className="rounded-[22px] border border-white/6 bg-[rgba(255,255,255,0.025)] px-4 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex items-center gap-3">
          <input
            checked={schedule.enabled}
            className="size-4 rounded border-[var(--border)] accent-[#36f57c]"
            type="checkbox"
            onChange={(event) => onChange({ ...schedule, enabled: event.currentTarget.checked })}
          />
          <span className="w-10 rounded-full border border-[rgba(195,164,111,0.18)] bg-[rgba(195,164,111,0.08)] px-3 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            {DAY_LABELS[day]}
          </span>
        </label>

        <div className="flex flex-1 items-center gap-3 lg:max-w-lg">
          {schedule.enabled ? (
            <>
              <input
                className="imperial-input h-11"
                type="time"
                value={schedule.open}
                onChange={(event) => onChange({ ...schedule, open: event.currentTarget.value })}
              />
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">até</span>
              <input
                className="imperial-input h-11"
                type="time"
                value={schedule.close}
                onChange={(event) => onChange({ ...schedule, close: event.currentTarget.value })}
              />
            </>
          ) : (
            <span className="text-sm text-[var(--text-soft)]">Fechado</span>
          )}
        </div>
      </div>
    </div>
  )
}

function AccessRow({ entry }: Readonly<{ entry: LastLoginEntry }>) {
  const isMobile = ['iPhone', 'iPad', 'Android'].includes(entry.os)
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(entry.createdAt))

  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-4 py-3">
      {isMobile ? (
        <Smartphone className="size-4 shrink-0 text-[var(--text-soft)]" />
      ) : (
        <Monitor className="size-4 shrink-0 text-[var(--text-soft)]" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {entry.browser} no {entry.os}
        </p>
        {entry.ipAddress ? <p className="mt-1 text-xs text-[var(--text-soft)]">{entry.ipAddress}</p> : null}
      </div>
      <p className="shrink-0 text-xs text-[var(--text-soft)]">{dateLabel}</p>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="skeleton-shimmer h-14 rounded-[18px]" key={index} />
      ))}
    </div>
  )
}

function InlineNotice({
  tone,
  message,
}: Readonly<{
  tone: 'danger' | 'muted'
  message: string
}>) {
  return (
    <div
      className={
        tone === 'danger'
          ? 'rounded-[18px] border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.06)] px-4 py-3 text-sm text-[#fca5a5]'
          : 'rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.025)] px-4 py-3 text-sm text-[var(--text-soft)]'
      }
    >
      {message}
    </div>
  )
}

function PinDigitRow({
  digits,
  label,
  error,
  disabled,
  onChange,
  onComplete,
  onResetError,
  refs,
}: Readonly<{
  digits: string[]
  label: string
  error?: string
  disabled: boolean
  onChange: (index: number, value: string) => void
  onComplete: (value: string) => void | Promise<void>
  onResetError: () => void
  refs?: Array<RefObject<HTMLInputElement | null>>
}>) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">{label}</p>
      <div className="flex gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={refs?.[index]}
            className="size-12 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-center text-lg font-semibold text-white outline-none transition focus:border-[rgba(52,242,127,0.4)]"
            disabled={disabled}
            inputMode="numeric"
            maxLength={1}
            pattern="[0-9]"
            type="password"
            value={digit}
            onChange={(event) => {
              const value = event.currentTarget.value.replace(/\D/g, '').slice(-1)
              onChange(index, value)
              onResetError()

              if (value && index < 3) {
                refs?.[index + 1]?.current?.focus()
              }

              const nextDigits = digits.map((entry, digitIndex) => (digitIndex === index ? value : entry))
              if (nextDigits.every((entry) => entry !== '')) {
                void onComplete(nextDigits.join(''))
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !digit && index > 0) {
                refs?.[index - 1]?.current?.focus()
              }
            }}
          />
        ))}
      </div>
      {error ? <p className="text-xs font-medium text-[#fca5a5]">{error}</p> : null}
    </div>
  )
}
