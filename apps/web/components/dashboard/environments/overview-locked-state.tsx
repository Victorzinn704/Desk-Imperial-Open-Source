import Link from 'next/link'
import { LabFactPill, LabPageHeader, LabPanel, LabSignalRow } from '@/components/design-lab/lab-primitives'
import { LabMetaRow, OverviewMetricBoard } from './overview-environment.lab'

export function OverviewLockedState() {
  return (
    <section className="space-y-6">
      <LabPageHeader
        description="Receita, lucro, ticket e alertas."
        eyebrow="visão geral da operação"
        meta={
          <div className="space-y-3">
            <LabMetaRow label="sessão" tone="warning" value="entrar" />
            <LabMetaRow label="dados" tone="neutral" value="bloqueados" />
            <LabMetaRow label="escopo" tone="info" value="resumo executivo" />
          </div>
        }
        title="Overview"
      >
        <OverviewMetricBoard
          items={[
            { description: 'sem leitura até autenticar', label: 'receita do mês', tone: 'neutral', value: 'R$ 0,00' },
            { description: 'resultado bloqueado', label: 'lucro do mês', tone: 'neutral', value: 'R$ 0,00' },
            { description: 'histórico indisponível', label: 'pedidos fechados', tone: 'neutral', value: '0' },
            { description: 'aguardando sessão ativa', label: 'ticket médio', tone: 'neutral', value: 'R$ 0,00' },
          ]}
        />
      </LabPageHeader>

      <LabPanel action={<LoginLink />} padding="md" title="Autenticação necessária">
        <LockedStateDetails />
      </LabPanel>
    </section>
  )
}

function LockedStateDetails() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <div className="space-y-0">
        <LabSignalRow
          label="receita"
          note="o resumo executivo abre após validar a sessão"
          tone="neutral"
          value="bloqueada"
        />
        <LabSignalRow
          label="lucro"
          note="resultado e margem voltam com a leitura financeira"
          tone="neutral"
          value="bloqueado"
        />
        <LabSignalRow
          label="pedidos"
          note="fluxo operacional só aparece com dados reais do workspace"
          tone="neutral"
          value="bloqueados"
        />
        <LabSignalRow
          label="estoque"
          note="alertas comerciais dependem da mesma sessão"
          tone="neutral"
          value="bloqueado"
        />
      </div>

      <div className="space-y-2">
        <LabFactPill label="empresa" value="não identificada" />
        <LabFactPill label="sessão" value="pendente" />
        <LabFactPill label="próximo passo" value="entrar no Desk" />
      </div>
    </div>
  )
}

function LoginLink() {
  return (
    <Link
      className="inline-flex h-9 items-center rounded-[8px] border border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] px-3 text-sm font-medium text-[var(--lab-blue)] transition hover:bg-[var(--lab-surface-hover)]"
      href="/login"
    >
      Entrar
    </Link>
  )
}
