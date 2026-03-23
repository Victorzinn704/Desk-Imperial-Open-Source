'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Cog, Lock, Bell, Building2, Eye, EyeOff, Monitor, Smartphone,
  Calendar, ShieldCheck, KeyRound, ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'
import { fetchLastLogins, type LastLoginEntry } from '@/lib/api'
import Link from 'next/link'
import { setupAdminPin, removeAdminPin } from '@/lib/admin-pin'
import { ApiError } from '@/lib/api'

type DayKey = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'
type DaySchedule = { enabled: boolean; open: string; close: string }

const DAY_LABELS: Record<DayKey, string> = {
  seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom',
}

const INITIAL_SCHEDULE: Record<DayKey, DaySchedule> = {
  seg: { enabled: true,  open: '09:00', close: '00:00' },
  ter: { enabled: true,  open: '09:00', close: '00:00' },
  qua: { enabled: true,  open: '09:00', close: '00:00' },
  qui: { enabled: true,  open: '09:00', close: '00:00' },
  sex: { enabled: true,  open: '16:00', close: '04:00' },
  sab: { enabled: true,  open: '16:00', close: '04:00' },
  dom: { enabled: true,  open: '16:00', close: '00:00' },
}

const periodOptions = [
  { value: '7',  label: '7 dias'  },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
]

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--border)] pb-4">
      <span className="flex size-8 items-center justify-center rounded-[10px] border border-[var(--border-strong)] bg-[rgba(195,164,111,0.07)] text-[var(--accent)]">
        <Icon className="size-4" />
      </span>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
    </div>
  )
}

export default function SettingsPage() {
  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [companyName, setCompanyName]     = useState('Bar do Pedrão')
  const [email, setEmail]                 = useState('demo@deskimperial.online')
  const [schedule, setSchedule]           = useState<Record<DayKey, DaySchedule>>(INITIAL_SCHEDULE)

  // Admin PIN state
  const [pinDigits, setPinDigits]                   = useState(['', '', '', ''])
  const [pinSaved, setPinSaved]                     = useState(false)
  const [pinSaving, setPinSaving]                   = useState(false)
  const [pinSaveError, setPinSaveError]             = useState('')
  const [pinActive, setPinActive]                   = useState<boolean | null>(null)
  const [confirmRemoveDigits, setConfirmRemoveDigits] = useState(['', '', '', ''])
  const [confirmRemoveError, setConfirmRemoveError] = useState('')
  const [showConfirmRemove, setShowConfirmRemove]   = useState(false)
  const [removeBlocked, setRemoveBlocked]           = useState(false)
  const [removeSecondsLeft, setRemoveSecondsLeft]   = useState(0)
  const [removing, setRemoving]                     = useState(false)
  const removeInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  const [showPillars, setShowPillars] = useState({
    weekly: true, monthly: true, profit: true, event: true, normal: true,
  })
  const [defaultPeriod, setDefaultPeriod] = useState('30')

  const activityQuery = useQuery({
    queryKey: ['auth', 'activity'],
    queryFn: fetchLastLogins,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (pinActive === null) setPinActive(false)
  }, [])

  useEffect(() => {
    if (!removeBlocked || removeSecondsLeft <= 0) return
    const id = setInterval(() => {
      setRemoveSecondsLeft((prev) => {
        const next = prev - 1
        if (next <= 0) { clearInterval(id); setRemoveBlocked(false); return 0 }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [removeBlocked, removeSecondsLeft])

  useEffect(() => {
    if (showConfirmRemove && !removeBlocked) {
      setTimeout(() => removeInputRefs[0].current?.focus(), 50)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showConfirmRemove, removeBlocked])

  async function handleSavePin() {
    const pin = pinDigits.join('')
    if (pin.length !== 4) return
    setPinSaving(true); setPinSaveError('')
    try {
      await setupAdminPin(pin)
      setPinSaved(true); setPinActive(true); setPinDigits(['', '', '', ''])
      setTimeout(() => setPinSaved(false), 3000)
    } catch (err) {
      setPinSaveError(err instanceof ApiError ? err.message : 'Erro ao salvar o PIN.')
    } finally {
      setPinSaving(false)
    }
  }

  async function handleConfirmRemoveDigitChange(i: number, rawValue: string) {
    const v = rawValue.replace(/\D/g, '').slice(-1)
    const next = [...confirmRemoveDigits]; next[i] = v
    setConfirmRemoveDigits(next); setConfirmRemoveError('')
    if (v && i < 3) removeInputRefs[i + 1].current?.focus()
    if (next.every((x) => x !== '') && v) await attemptRemovePin(next.join(''))
  }

  async function attemptRemovePin(pin: string) {
    setRemoving(true)
    try {
      await removeAdminPin(pin)
      setPinActive(false); setShowConfirmRemove(false)
      setConfirmRemoveDigits(['', '', '', '']); setConfirmRemoveError('')
    } catch (err) {
      setConfirmRemoveDigits(['', '', '', ''])
      if (err instanceof ApiError) {
        if (err.status === 423) {
          const match = err.message.match(/(\d+)\s*s/i)
          setRemoveBlocked(true); setRemoveSecondsLeft(match ? Number(match[1]) : 300)
        } else if (err.status === 401) {
          setConfirmRemoveError(err.message || 'PIN incorreto. Tente novamente.')
          setTimeout(() => removeInputRefs[0].current?.focus(), 50)
        } else {
          setConfirmRemoveError(err.message || 'Erro ao remover o PIN.')
          setTimeout(() => removeInputRefs[0].current?.focus(), 50)
        }
      } else {
        setConfirmRemoveError('Erro inesperado. Tente novamente.')
        setTimeout(() => removeInputRefs[0].current?.focus(), 50)
      }
    } finally {
      setRemoving(false)
    }
  }

  function formatCountdown(seconds: number) {
    const m = Math.floor(seconds / 60); const s = seconds % 60
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
  }

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) { alert('As senhas não conferem'); return }
    alert('Senha alterada com sucesso!')
    setNewPassword(''); setConfirmPassword('')
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">

        {/* Page title */}
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(195,164,111,0.25)] bg-[rgba(195,164,111,0.1)] text-[var(--accent)]">
            <Cog className="size-5" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold text-white">Configurações</h1>
            <p className="text-sm text-[var(--text-soft)]">Conta, segurança e preferências do portal</p>
          </div>
        </div>

        {/* SECTION 1 — Conta */}
        <section className="imperial-card mb-6 space-y-6 p-6 sm:p-8">
          <SectionHeader icon={Cog} title="Conta" />

          <div className="space-y-4">
            <InputField
              label="Nome do Estabelecimento"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome do seu negócio"
            />

            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ceo@empresa.com"
            />

            <div>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--text-muted)]">Nova Senha</span>
                <div className="relative">
                  <input
                    className="imperial-input h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 pr-12 text-sm text-[var(--text-primary)] transition-[border-color] duration-200 placeholder:text-[var(--text-soft)]"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    placeholder="Nova senha segura"
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-soft)] transition hover:text-[var(--text-primary)]"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>
            </div>

            <InputField
              label="Confirmar Senha"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
            />

            <Button className="w-full" onClick={handlePasswordChange}>
              Atualizar Conta
            </Button>
          </div>
        </section>

        {/* SECTION 2 — Segurança */}
        <section className="imperial-card mb-6 space-y-6 p-6 sm:p-8">
          <SectionHeader icon={Lock} title="Segurança" />

          {/* MFA (coming soon) */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <h3 className="text-sm font-semibold text-[var(--accent)]">MFA (Autenticação Multi-Fator)</h3>
            <p className="mt-2 text-sm text-[var(--text-soft)]">Recurso em breve. Ative 2FA para maior segurança.</p>
            <button className="mt-4 cursor-not-allowed rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-soft)] opacity-40" disabled>
              Ativar (em breve)
            </button>
          </div>

          {/* Admin PIN */}
          <div className="rounded-2xl border border-[rgba(52,242,127,0.14)] bg-[rgba(52,242,127,0.04)] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-[#36f57c]" />
                <h3 className="text-sm font-semibold text-white">PIN de Administrador</h3>
              </div>
              {pinActive && (
                <span className="flex items-center gap-1.5 rounded-full border border-[rgba(52,242,127,0.25)] bg-[rgba(52,242,127,0.1)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#8fffb9]">
                  <ShieldCheck className="size-3" />Ativo
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Proteja ações sensíveis (descontos, exclusões, novos produtos) com um PIN de 4 dígitos.
            </p>

            {!pinActive ? (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  {pinDigits.map((d, i) => (
                    <input
                      key={i}
                      className="size-12 rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-center text-lg font-bold text-white outline-none focus:border-[rgba(52,242,127,0.4)] [appearance:textfield]"
                      disabled={pinSaving}
                      inputMode="numeric"
                      maxLength={1}
                      type="password"
                      value={d}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(-1)
                        const next = [...pinDigits]; next[i] = v
                        setPinDigits(next); setPinSaveError('')
                        if (v && i < 3) {
                          const nextEl = e.target.parentElement?.children[i + 1] as HTMLInputElement
                          nextEl?.focus()
                        }
                      }}
                    />
                  ))}
                </div>
                {pinSaveError && <p className="text-xs font-medium text-[#fca5a5]">{pinSaveError}</p>}
                <button
                  className="rounded-[12px] border border-[rgba(52,242,127,0.35)] bg-[rgba(52,242,127,0.1)] px-4 py-2.5 text-sm font-semibold text-[#36f57c] transition-all hover:bg-[rgba(52,242,127,0.18)] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={pinDigits.join('').length !== 4 || pinSaving}
                  type="button"
                  onClick={handleSavePin}
                >
                  {pinSaving ? 'Salvando...' : pinSaved ? 'PIN salvo!' : 'Ativar PIN'}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {!showConfirmRemove ? (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-[var(--text-soft)]">PIN configurado e ativo no PDV.</p>
                    <button
                      className="rounded-[12px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3 py-1.5 text-xs font-semibold text-[#fca5a5] transition-all hover:bg-[rgba(239,68,68,0.14)]"
                      type="button"
                      onClick={() => { setShowConfirmRemove(true); setConfirmRemoveError(''); setRemoveBlocked(false) }}
                    >
                      Remover PIN
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-[14px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] p-4">
                    <p className="text-sm font-semibold text-white">Confirme o PIN atual para desativar</p>
                    {removeBlocked ? (
                      <div className="rounded-[12px] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] px-4 py-4 text-center">
                        <ShieldAlert className="mx-auto mb-2 size-5 text-red-400" />
                        <p className="text-sm font-semibold text-[#fca5a5]">Bloqueado</p>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-white">{formatCountdown(removeSecondsLeft)}</p>
                        <p className="mt-1 text-xs text-[var(--text-soft)]">Aguarde para tentar novamente</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-[var(--text-soft)]">Digite o PIN de 4 dígitos para confirmar a remoção.</p>
                        <div className="flex gap-2">
                          {confirmRemoveDigits.map((d, i) => (
                            <input
                              key={i}
                              ref={removeInputRefs[i]}
                              className="size-12 rounded-[12px] border text-center text-lg font-bold text-white outline-none transition-all [appearance:textfield]"
                              disabled={removing}
                              inputMode="numeric"
                              maxLength={1}
                              type="password"
                              value={d}
                              style={{
                                background: d ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                                borderColor: confirmRemoveError ? 'rgba(239,68,68,0.5)' : d ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)',
                                opacity: removing ? 0.5 : 1,
                              }}
                              onChange={(e) => handleConfirmRemoveDigitChange(i, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Backspace' && !d && i > 0) removeInputRefs[i - 1].current?.focus()
                              }}
                            />
                          ))}
                        </div>
                        {confirmRemoveError && <p className="text-xs font-medium text-[#fca5a5]">{confirmRemoveError}</p>}
                      </>
                    )}
                    <button
                      className="text-xs text-[var(--text-soft)] underline hover:text-white"
                      type="button"
                      onClick={() => { setShowConfirmRemove(false); setConfirmRemoveDigits(['', '', '', '']); setConfirmRemoveError('') }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Last logins */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Últimos Acessos</h3>
            <div className="space-y-2">
              {activityQuery.isLoading && (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-xl bg-[rgba(255,255,255,0.04)]" />
                  ))}
                </div>
              )}
              {activityQuery.error && (
                <p className="text-xs text-[var(--danger)]">Não foi possível carregar o histórico.</p>
              )}
              {activityQuery.data?.length === 0 && (
                <p className="text-sm text-[var(--text-soft)]">Nenhum acesso registrado ainda.</p>
              )}
              {activityQuery.data?.map((entry: LastLoginEntry) => {
                const isMobile = ['iPhone', 'iPad', 'Android'].includes(entry.os)
                return (
                  <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5">
                    {isMobile
                      ? <Smartphone className="size-4 shrink-0 text-[var(--text-soft)]" />
                      : <Monitor className="size-4 shrink-0 text-[var(--text-soft)]" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{entry.browser} no {entry.os}</p>
                      {entry.ipAddress && <p className="text-xs text-[var(--text-soft)]">{entry.ipAddress}</p>}
                    </div>
                    <p className="shrink-0 text-xs text-[var(--text-soft)]">
                      {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(entry.createdAt))}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* SECTION 3 — Dashboard Preferences */}
        <section className="imperial-card mb-6 space-y-6 p-6 sm:p-8">
          <SectionHeader icon={Bell} title="Preferências do Dashboard" />

          <div className="space-y-3">
            {([
              { key: 'weekly',  label: 'Vendas Semanal' },
              { key: 'monthly', label: 'Vendas Mensal' },
              { key: 'profit',  label: 'Lucro' },
              { key: 'event',   label: 'Desempenho em Eventos' },
              { key: 'normal',  label: 'Desempenho Normal' },
            ] as const).map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 transition hover:border-[var(--border-strong)]"
              >
                <input
                  type="checkbox"
                  checked={showPillars[key]}
                  onChange={(e) => setShowPillars({ ...showPillars, [key]: e.target.checked })}
                  className="size-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                />
                <span className="text-sm font-medium text-white">{label}</span>
              </label>
            ))}
          </div>

          <SelectField
            label="Período Padrão"
            options={periodOptions}
            value={defaultPeriod}
            onChange={(e) => setDefaultPeriod(e.target.value)}
          />
        </section>

        {/* SECTION 4 — Establishment */}
        <section className="imperial-card space-y-8 p-6 sm:p-8">
          <SectionHeader icon={Building2} title="Estabelecimento" />

          {/* Business hours */}
          <div>
            <p className="mb-3 text-sm font-semibold text-[var(--text-soft)]">Horário de Funcionamento</p>
            <div className="space-y-2">
              {(Object.keys(DAY_LABELS) as DayKey[]).map((day) => {
                const s = schedule[day]
                return (
                  <div key={day} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2.5">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={s.enabled}
                        onChange={(e) => setSchedule({ ...schedule, [day]: { ...s, enabled: e.target.checked } })}
                        className="size-3.5 rounded border-[var(--border)] accent-[#36f57c]"
                      />
                      <span className="w-8 text-xs font-semibold text-[var(--text-soft)]">{DAY_LABELS[day]}</span>
                    </label>
                    {s.enabled ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="time"
                          value={s.open}
                          onChange={(e) => setSchedule({ ...schedule, [day]: { ...s, open: e.target.value } })}
                          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]"
                        />
                        <span className="text-xs text-[var(--text-muted)]">até</span>
                        <input
                          type="time"
                          value={s.close}
                          onChange={(e) => setSchedule({ ...schedule, [day]: { ...s, close: e.target.value } })}
                          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    ) : (
                      <span className="flex-1 text-xs text-[var(--text-muted)]">Fechado</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Commercial calendar link */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="size-4 text-[var(--accent)]" />
              <p className="text-sm font-semibold text-[var(--text-soft)]">Calendário Comercial</p>
            </div>
            <Link href="/dashboard">
              <div className="flex items-center justify-between rounded-2xl border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.05)] px-5 py-4 transition-all hover:bg-[rgba(52,242,127,0.1)]">
                <div>
                  <p className="text-sm font-semibold text-white">Acessar Calendário de Atividades</p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                    Arraste eventos, planeje promoções, jogos e datas especiais com impacto em vendas.
                  </p>
                </div>
                <span className="ml-4 shrink-0 text-[#36f57c]">→</span>
              </div>
            </Link>
          </div>

          <Button className="w-full">Salvar Configurações</Button>
        </section>

      </div>
    </main>
  )
}
