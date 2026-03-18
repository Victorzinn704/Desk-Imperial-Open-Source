'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Cog, Lock, Bell, Building2, Eye, EyeOff, Monitor, Smartphone, Calendar, ShieldCheck, KeyRound } from 'lucide-react'
import { Button } from '@/components/shared/button'
import { fetchLastLogins, type LastLoginEntry } from '@/lib/api'
import { CommercialCalendar } from '@/components/calendar/commercial-calendar'

type DayKey = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'

type DaySchedule = {
  enabled: boolean
  open: string
  close: string
}

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

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [companyName, setCompanyName] = useState('Bar do Pedrão')
  const [email, setEmail] = useState('demo@deskimperial.online')
  const [schedule, setSchedule] = useState<Record<DayKey, DaySchedule>>(INITIAL_SCHEDULE)

  // Admin PIN state
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [pinSaved, setPinSaved] = useState(false)
  const [pinActive, setPinActive] = useState(() => Boolean(typeof window !== 'undefined' && localStorage.getItem('desk_imperial_pin')))

  function handleSavePin() {
    const pin = pinDigits.join('')
    if (pin.length !== 4) return
    localStorage.setItem('desk_imperial_pin', pin)
    setPinSaved(true)
    setPinActive(true)
    setPinDigits(['', '', '', ''])
    setTimeout(() => setPinSaved(false), 3000)
  }

  function handleRemovePin() {
    localStorage.removeItem('desk_imperial_pin')
    setPinActive(false)
    setPinDigits(['', '', '', ''])
  }

  const [showPillars, setShowPillars] = useState({
    weekly: true,
    monthly: true,
    profit: true,
    event: true,
    normal: true,
  })

  const activityQuery = useQuery({
    queryKey: ['auth', 'activity'],
    queryFn: fetchLastLogins,
    staleTime: 5 * 60 * 1000,
  })

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      alert('As senhas não conferem')
      return
    }
    alert('Senha alterada com sucesso!')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <Cog className="size-8 text-[var(--accent)]" />
          <h1 className="text-4xl font-semibold text-white">Configurações</h1>
        </div>

        {/* SEÇÃO 1: Conta */}
        <section className="imperial-card mb-6 space-y-6 p-8">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="text-xl font-semibold text-white">Conta</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-soft)]">Nome do Estabelecimento</label>
              <input
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-white placeholder-[var(--text-muted)]"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-soft)]">Email</label>
              <input
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-white placeholder-[var(--text-muted)]"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-soft)]">Nova Senha</label>
              <div className="relative mt-2">
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 pr-10 text-white placeholder-[var(--text-muted)]"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[var(--text-muted)]"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-soft)]">Confirmar Senha</label>
              <input
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-white placeholder-[var(--text-muted)]"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button onClick={handlePasswordChange} className="w-full">
              Atualizar Conta
            </Button>
          </div>
        </section>

        {/* SEÇÃO 2: Segurança */}
        <section className="imperial-card mb-6 space-y-6 p-8">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <Lock className="size-5" />
              Segurança
            </h2>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <h3 className="text-sm font-semibold text-[var(--accent)]">MFA (Autenticação Multi-Fator)</h3>
            <p className="mt-2 text-sm text-[var(--text-soft)]">Recurso em breve. Ative 2FA para maior segurança.</p>
            <button className="mt-4 rounded-lg bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-soft)] opacity-50 cursor-not-allowed">
              Ativar (em breve)
            </button>
          </div>

          {/* Admin PIN */}
          <div className="rounded-[16px] border border-[rgba(52,242,127,0.14)] bg-[rgba(52,242,127,0.04)] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-[#36f57c]" />
                <h3 className="text-sm font-semibold text-white">PIN de Administrador</h3>
              </div>
              {pinActive && (
                <span className="flex items-center gap-1.5 rounded-full border border-[rgba(52,242,127,0.25)] bg-[rgba(52,242,127,0.1)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#8fffb9]">
                  <ShieldCheck className="size-3" />
                  Ativo
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
                      inputMode="numeric"
                      maxLength={1}
                      pattern="[0-9]"
                      type="password"
                      value={d}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(-1)
                        const next = [...pinDigits]
                        next[i] = v
                        setPinDigits(next)
                        if (v && i < 3) {
                          const nextInput = e.target.parentElement?.children[i + 1] as HTMLInputElement
                          nextInput?.focus()
                        }
                      }}
                    />
                  ))}
                </div>
                <button
                  className="rounded-[12px] border border-[rgba(52,242,127,0.35)] bg-[rgba(52,242,127,0.1)] px-4 py-2.5 text-sm font-semibold text-[#36f57c] transition-all hover:bg-[rgba(52,242,127,0.18)] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={pinDigits.join('').length !== 4}
                  type="button"
                  onClick={handleSavePin}
                >
                  {pinSaved ? 'PIN salvo!' : 'Ativar PIN'}
                </button>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-3">
                <p className="text-sm text-[var(--text-soft)]">PIN configurado e ativo no PDV.</p>
                <button
                  className="rounded-[12px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3 py-1.5 text-xs font-semibold text-[#fca5a5] hover:bg-[rgba(239,68,68,0.14)]"
                  type="button"
                  onClick={handleRemovePin}
                >
                  Remover PIN
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <h3 className="text-sm font-semibold text-white">Últimos Acessos</h3>
            <div className="mt-3 space-y-2">
              {activityQuery.isLoading && (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-[rgba(255,255,255,0.04)]" />
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
                  <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5">
                    {isMobile
                      ? <Smartphone className="size-4 shrink-0 text-[var(--text-soft)]" />
                      : <Monitor className="size-4 shrink-0 text-[var(--text-soft)]" />
                    }
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">
                        {entry.browser} no {entry.os}
                      </p>
                      {entry.ipAddress && (
                        <p className="text-xs text-[var(--text-soft)]">{entry.ipAddress}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-[var(--text-soft)]">
                      {new Intl.DateTimeFormat('pt-BR', {
                        day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      }).format(new Date(entry.createdAt))}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* SEÇÃO 3: Preferências do Dashboard */}
        <section className="imperial-card mb-6 space-y-6 p-8">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <Bell className="size-5" />
              Preferências do Dashboard
            </h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={showPillars.weekly}
                onChange={(e) => setShowPillars({ ...showPillars, weekly: e.target.checked })}
                className="size-4 rounded border-[var(--border)]"
              />
              <span className="text-sm text-white">Vendas Semanal</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={showPillars.monthly}
                onChange={(e) => setShowPillars({ ...showPillars, monthly: e.target.checked })}
                className="size-4 rounded border-[var(--border)]"
              />
              <span className="text-sm text-white">Vendas Mensal</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={showPillars.profit}
                onChange={(e) => setShowPillars({ ...showPillars, profit: e.target.checked })}
                className="size-4 rounded border-[var(--border)]"
              />
              <span className="text-sm text-white">Lucro</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={showPillars.event}
                onChange={(e) => setShowPillars({ ...showPillars, event: e.target.checked })}
                className="size-4 rounded border-[var(--border)]"
              />
              <span className="text-sm text-white">Desempenho em Eventos</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={showPillars.normal}
                onChange={(e) => setShowPillars({ ...showPillars, normal: e.target.checked })}
                className="size-4 rounded border-[var(--border)]"
              />
              <span className="text-sm text-white">Desempenho Normal</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-soft)]">Período Padrão</label>
            <select className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-white">
              <option>7 dias</option>
              <option>30 dias</option>
              <option>90 dias</option>
            </select>
          </div>
        </section>

        {/* SEÇÃO 4: Estabelecimento */}
        <section className="imperial-card space-y-8 p-8">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <Building2 className="size-5" />
              Estabelecimento
            </h2>
          </div>

          {/* Horário por dia */}
          <div>
            <p className="text-sm font-semibold text-[var(--text-soft)] mb-3">Horário de Funcionamento</p>
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
                          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-white"
                        />
                        <span className="text-xs text-[var(--text-muted)]">até</span>
                        <input
                          type="time"
                          value={s.close}
                          onChange={(e) => setSchedule({ ...schedule, [day]: { ...s, close: e.target.value } })}
                          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-white"
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

          {/* Atividades comerciais — Calendário interativo */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="size-4 text-[var(--accent)]" />
              <p className="text-sm font-semibold text-[var(--text-soft)]">Calendário Comercial</p>
              <span className="ml-2 rounded-full border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.07)] px-2.5 py-0.5 text-[11px] font-semibold text-[#8fffb9]">
                Clique no dia para adicionar
              </span>
            </div>
            <CommercialCalendar />
          </div>

          <Button className="w-full">Salvar Configurações</Button>
        </section>
      </div>
    </main>
  )
}
