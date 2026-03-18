'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Cog, Lock, Bell, Building2, Eye, EyeOff, Monitor, Smartphone } from 'lucide-react'
import { Button } from '@/components/shared/button'
import { fetchLastLogins, type LastLoginEntry } from '@/lib/api'

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [companyName, setCompanyName] = useState('Bar do Pedrão')
  const [email, setEmail] = useState('demo@deskimperial.online')
  const [startHour, setStartHour] = useState('09')
  const [endHour, setEndHour] = useState('00')
  const [eventStartHour, setEventStartHour] = useState('16')
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
        <section className="imperial-card space-y-6 p-8">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <Building2 className="size-5" />
              Estabelecimento
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-soft)]">Horário de Funcionamento</label>
              <div className="mt-2 flex gap-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)]">Abertura</label>
                  <input
                    type="time"
                    value={`${startHour}:00`}
                    onChange={(e) => setStartHour(e.target.value.split(':')[0])}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)]">Fechamento</label>
                  <input
                    type="time"
                    value={`${endHour}:00`}
                    onChange={(e) => setEndHour(e.target.value.split(':')[0])}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-soft)]">Horário de Eventos (Sexta/Sábado/Domingo)</label>
              <div className="mt-2">
                <label className="block text-xs text-[var(--text-muted)]">Começa às</label>
                <input
                  type="time"
                  value={`${eventStartHour}:00`}
                  onChange={(e) => setEventStartHour(e.target.value.split(':')[0])}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-white"
                />
              </div>
            </div>

            <Button className="w-full">Salvar Configurações</Button>
          </div>
        </section>
      </div>
    </main>
  )
}
