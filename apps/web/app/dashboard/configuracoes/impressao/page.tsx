'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ThermalPrintSettingsCard } from '@/components/shared/thermal-print-settings-card'

export default function ImpressaoTermicaConfigPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-8 text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <Link
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)] hover:text-[var(--text-primary)]"
            href="/design-lab/config?tab=account"
          >
            <ArrowLeft className="size-3.5" />
            voltar
          </Link>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
              Configuracoes
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">Impressao termica</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
              Conecte uma ou mais rotas de impressao. Se a preferida falhar, o sistema tenta as outras automaticamente.
            </p>
          </div>
        </header>

        <ThermalPrintSettingsCard enabledProviders={['QZ_TRAY']} />
      </div>
    </main>
  )
}
