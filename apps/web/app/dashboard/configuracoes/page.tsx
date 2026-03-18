'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Cog, Lock, Bell, Building2, Eye, EyeOff, Monitor, Smartphone, Plus, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/shared/button'
import { fetchLastLogins, type LastLoginEntry } from '@/lib/api'

type DayKey = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'

type DaySchedule = {
  enabled: boolean
  open: string
  close: string
}

type ActivityType = 'evento' | 'jogo' | 'promocao' | 'feriado' | 'black_friday' | 'data_especial'

type CommercialActivity = {
  id: string
  name: string
  type: ActivityType
  startDate: string
  endDate: string
}

const DAY_LABELS: Record<DayKey, string> = {
  seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom',
}

const ACTIVITY_TYPES: { value: ActivityType; label: string; color: string }[] = [
  { value: 'evento',       label: 'Evento',          color: '#a78bfa' },
  { value: 'jogo',         label: 'Jogo',             color: '#38bdf8' },
  { value: 'promocao',     label: 'Promoção',         color: '#36f57c' },
  { value: 'feriado',      label: 'Feriado',          color: '#fb923c' },
  { value: 'black_friday', label: 'Black Friday',     color: '#f04438' },
  { value: 'data_especial',label: 'Data Especial',    color: '#C9A84C' },
]

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
  const [activities, setActivities] = useState<CommercialActivity[]>([])
  const [newActivity, setNewActivity] = useState<Omit<CommercialActivity, 'id'>>({
    name: '', type: 'evento', startDate: '', endDate: '',
  })
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

          {/* Atividades comerciais */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-[var(--accent)]" />
                <p className="text-sm font-semibold text-[var(--text-soft)]">Atividades Comerciais</p>
              </div>
              <span className="text-xs text-[var(--text-muted)]">Filtre vendas por período e tipo de evento</span>
            </div>

            {/* lista */}
            {activities.length > 0 && (
              <div className="mb-4 space-y-2">
                {activities.map((act) => {
                  const typeInfo = ACTIVITY_TYPES.find((t) => t.value === act.type)
                  return (
                    <div key={act.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ background: `${typeInfo?.color}22`, color: typeInfo?.color }}
                      >
                        {typeInfo?.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{act.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {act.startDate && new Date(act.startDate).toLocaleDateString('pt-BR')}
                          {act.endDate && act.endDate !== act.startDate && ` → ${new Date(act.endDate).toLocaleDateString('pt-BR')}`}
                        </p>
                      </div>
                      <button
                        onClick={() => setActivities(activities.filter((a) => a.id !== act.id))}
                        className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[rgba(244,67,54,0.1)] hover:text-[var(--danger)]"
                        type="button"
                        aria-label="Remover atividade"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* formulário de adição */}
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Nova atividade</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white placeholder-[var(--text-muted)] col-span-full sm:col-span-1"
                  placeholder="Nome (ex: Festa de Ano Novo)"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                />
                <select
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white"
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as ActivityType })}
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <div className="space-y-1">
                  <label className="block text-xs text-[var(--text-muted)]">Início</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white"
                    value={newActivity.startDate}
                    onChange={(e) => setNewActivity({ ...newActivity, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-[var(--text-muted)]">Fim</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-white"
                    value={newActivity.endDate}
                    onChange={(e) => setNewActivity({ ...newActivity, endDate: e.target.value })}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!newActivity.name.trim() || !newActivity.startDate) return
                  setActivities([...activities, { ...newActivity, id: crypto.randomUUID() }])
                  setNewActivity({ name: '', type: 'evento', startDate: '', endDate: '' })
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(52,242,127,0.25)] bg-[rgba(52,242,127,0.06)] py-2.5 text-sm font-semibold text-[#36f57c] transition-colors hover:bg-[rgba(52,242,127,0.12)]"
                type="button"
              >
                <Plus className="size-4" />
                Adicionar atividade
              </button>
            </div>
          </div>

          <Button className="w-full">Salvar Configurações</Button>
        </section>
      </div>
    </main>
  )
}
