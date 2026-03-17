'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Building2,
  CircleDot,
  Cog,
  UserRound,
} from 'lucide-react'
import { formatAccountStatus } from '@/lib/dashboard-format'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/shared/brand-mark'

export type DashboardSidebarItem<TSection extends string = string> = {
  id: TSection
  label: string
  description: string
  icon: LucideIcon
}

export function DashboardSidebar<TSection extends string>({
  activeSection,
  companyName,
  email,
  items,
  onNavigate,
  status,
  userName,
}: Readonly<{
  activeSection: TSection
  companyName: string | null
  email: string
  items: DashboardSidebarItem<TSection>[]
  onNavigate: (section: TSection) => void
  status: string
  userName: string
}>) {
  return (
    <aside className="xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)]">
      <div className="imperial-card flex max-h-[calc(100vh-3rem)] min-h-0 flex-col p-5">
        <BrandMark />

        <div className="imperial-card-soft mt-6 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-12 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(47,255,122,0.24),rgba(18,122,64,0.2))] text-[#36f57c] shadow-[0_0_30px_rgba(52,242,127,0.22)]">
              <Building2 className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Operacao ativa
              </p>
              <p className="mt-2 text-2xl font-semibold uppercase tracking-[0.04em] text-white">
                {companyName || 'Painel corporativo'}
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                Ambiente principal para vendas, produtos, conformidade e conta.
              </p>
            </div>
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <button
                className={cn(
                  'group flex w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition-all duration-200',
                  isActive
                    ? 'border-[rgba(52,242,127,0.45)] bg-[linear-gradient(135deg,rgba(47,255,122,0.18),rgba(14,85,45,0.22))] text-white shadow-[0_0_34px_rgba(52,242,127,0.16)]'
                    : 'border-transparent bg-transparent text-[var(--text-soft)] hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)] hover:text-white',
                )}
                key={item.id}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <span
                  className={cn(
                    'flex size-11 items-center justify-center rounded-[18px] border transition-all duration-200',
                    isActive
                      ? 'border-[rgba(52,242,127,0.28)] bg-[rgba(52,242,127,0.12)] text-[#36f57c]'
                      : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] group-hover:text-white',
                  )}
                >
                  <Icon className="size-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">{item.label}</span>
                  <span className="mt-1 block text-sm text-[var(--text-soft)]">{item.description}</span>
                </span>

                <ArrowRight
                  className={cn(
                    'size-4 transition-transform duration-200',
                    isActive ? 'translate-x-0 text-[#36f57c]' : 'translate-x-0 text-[var(--text-soft)] group-hover:translate-x-1 group-hover:text-white',
                  )}
                />
              </button>
            )
          })}
        </nav>

        <div className="mt-4 space-y-4 border-t border-[rgba(255,255,255,0.06)] pt-4">
          <div className="imperial-card-soft p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-white">
                <UserRound className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{companyName || 'Conta Demo'}</p>
                <p className="truncate text-sm text-[var(--text-soft)]">{userName}</p>
                <p className="truncate text-xs text-[var(--text-soft)]">{email}</p>
              </div>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.08)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8fffb9]">
              <CircleDot className="size-3.5" />
              {formatAccountStatus(status)}
            </div>
          </div>

          <Link
            className="group flex w-full items-center gap-3 rounded-[20px] border border-transparent bg-transparent px-4 py-3 text-[var(--text-soft)] transition-all duration-200 hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)] hover:text-white"
            href="/dashboard/configuracoes"
          >
            <span className="flex size-9 items-center justify-center rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] transition-all duration-200 group-hover:text-white">
              <Cog className="size-4" />
            </span>
            <span className="text-sm font-semibold">Configuracoes</span>
          </Link>
        </div>
      </div>
    </aside>
  )
}
