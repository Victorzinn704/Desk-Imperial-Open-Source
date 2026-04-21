'use client'

import { BarChart3, Cog, Package, Shield } from 'lucide-react'

export function OwnerAccountView({
  companyName,
  displayName,
  onOpenDashboard,
  onOpenQuickRegister,
  onOpenSecurity,
  onOpenSettings,
}: Readonly<{
  companyName: string
  displayName: string
  onOpenDashboard: () => void
  onOpenQuickRegister: () => void
  onOpenSecurity: () => void
  onOpenSettings: () => void
}>) {
  return (
    <div className="space-y-4 p-3 pb-6">
      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Conta</p>
        <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{displayName}</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">{companyName}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {['proprietário', 'acesso global', 'configuração móvel'].map((label) => (
            <span
              className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]"
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">Sistema</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">Ajustes do workspace e superfícies mais amplas.</p>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {[
            {
              label: 'Configurações',
              description: 'Conta, preferências e controles gerais do workspace.',
              Icon: Cog,
              onClick: onOpenSettings,
              accent: '#008cff',
            },
            {
              label: 'Painel completo',
              description: 'Abrir a superfície desktop com visão integral do sistema.',
              Icon: BarChart3,
              onClick: onOpenDashboard,
              accent: '#60a5fa',
            },
          ].map(({ label, description, Icon, onClick, accent }) => (
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-[var(--surface-muted)]"
              key={label}
              type="button"
              onClick={onClick}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
                style={{
                  color: accent,
                  borderColor: `${accent}33`,
                  background: `${accent}14`,
                }}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--text-primary)]">{label}</span>
                <span className="mt-1 block text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{description}</span>
              </span>
              <span className="text-xs font-semibold text-[var(--text-soft)]">Abrir</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">Operação</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">Ferramentas que sustentam o trabalho do balcão e do turno.</p>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {[
            {
              label: 'Catálogo e cadastro rápido',
              description: 'Abrir o fluxo de scan de EAN e inclusão operacional no catálogo.',
              Icon: Package,
              onClick: onOpenQuickRegister,
              accent: '#36f57c',
            },
            {
              label: 'Segurança',
              description: 'Sessão, proteção e parâmetros sensíveis do acesso proprietário.',
              Icon: Shield,
              onClick: onOpenSecurity,
              accent: '#fbbf24',
            },
          ].map(({ label, description, Icon, onClick, accent }) => (
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-[var(--surface-muted)]"
              key={label}
              type="button"
              onClick={onClick}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
                style={{
                  color: accent,
                  borderColor: `${accent}33`,
                  background: `${accent}14`,
                }}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--text-primary)]">{label}</span>
                <span className="mt-1 block text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{description}</span>
              </span>
              <span className="text-xs font-semibold text-[var(--text-soft)]">Abrir</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
