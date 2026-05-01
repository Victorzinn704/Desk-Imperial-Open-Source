'use client'

import Link from 'next/link'
import { PayrollEnvironment } from '@/components/dashboard/payroll-environment'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import {
  LabFactPill,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'

export default function DesignLabPayrollPage() {
  const { sessionQuery, employeesQuery, financeQuery } = useDashboardQueries({ section: 'payroll' })
  const user = sessionQuery.data?.user

  if (sessionQuery.isLoading) {
    return (
      <section className="space-y-6">
        <LabPageHeader
          eyebrow="Gestao salarial"
          title="Folha de pagamento"
          description="Fechamento salarial, comissões e pendências."
        />

        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-fg-soft)]">Carregando sessão para abrir a folha.</p>
        </LabPanel>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="space-y-6">
        <LabPageHeader
          eyebrow="Gestao salarial"
          title="Folha de pagamento"
          description="Fechamento salarial, comissões e pendências."
        />

        <PayrollLockedState />
      </section>
    )
  }

  return <PayrollEnvironment employees={employeesQuery.data?.items ?? []} finance={financeQuery.data} />
}

function PayrollLockedState() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <LabPanel
        action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
        padding="md"
        title="Prévia travada da folha"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <LabFactPill label="periodo" value="abril 2026" />
            <LabFactPill label="ativos" value="4" />
            <LabFactPill label="folha" value="R$ 3.240,00" />
            <LabFactPill label="pagos" value="2/4" />
          </div>

          <div className="space-y-0">
            <LabSignalRow
              label="fechamento mensal"
              note="o login libera período, folha prevista, pendências e exportação do recorte"
              tone="info"
              value="ao entrar"
            />
            <LabSignalRow
              label="pagamentos"
              note="cada colaborador volta com marcação de pago e status do fechamento"
              tone="success"
              value="bloqueado"
            />
            <LabSignalRow
              label="próximo passo"
              note="a leitura volta com checklist de base, comissão e pagamentos restantes"
              tone="warning"
              value="autenticar"
            />
          </div>

          <div className="pt-1">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
              href="/login"
            >
              Entrar para liberar folha
            </Link>
          </div>
        </div>
      </LabPanel>

      <LabPanel action={<LabStatusPill tone="info">preview</LabStatusPill>} padding="md" title="O que abre na folha">
        <div className="space-y-0">
          <LabSignalRow
            label="período e recorte"
            note="mês, colaboradores ativos e ritmo de fechamento"
            tone="neutral"
            value="sim"
          />
          <LabSignalRow
            label="pagamentos"
            note="status individual, marcação em lote e pendências"
            tone="success"
            value="sim"
          />
          <LabSignalRow
            label="comissões"
            note="leitura salarial nasce da mesma base da equipe e do financeiro"
            tone="info"
            value="sim"
          />
          <LabSignalRow
            label="exportação"
            note="CSV do período volta como saída operacional do fechamento"
            tone="warning"
            value="sim"
          />
        </div>
      </LabPanel>
    </div>
  )
}
