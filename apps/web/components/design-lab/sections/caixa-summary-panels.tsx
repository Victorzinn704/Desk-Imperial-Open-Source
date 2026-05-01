'use client'

import type { OperationsLiveResponse } from '@contracts/contracts'
import { LabPanel, LabStatusPill, type LabStatusTone } from '@/components/design-lab/lab-primitives'
import { formatBRL } from '@/lib/currency'
import { buildOperationsExecutiveKpis } from '@/lib/operations'

const fmtBRL = formatBRL

export function CaixaSummaryPanels({ operations }: Readonly<{ operations: OperationsLiveResponse | undefined }>) {
  const kpis = buildOperationsExecutiveKpis(operations)
  const caixaAberto = kpis.openSessionsCount > 0

  return (
    <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)] xl:items-start">
      <CaixaReadingPanel caixaAberto={caixaAberto} kpis={kpis} />
      <CaixaRadarPanel caixaAberto={caixaAberto} kpis={kpis} />
    </div>
  )
}

function CaixaReadingPanel({
  caixaAberto,
  kpis,
}: Readonly<{
  caixaAberto: boolean
  kpis: ReturnType<typeof buildOperationsExecutiveKpis>
}>) {
  return (
    <LabPanel
      action={<LabStatusPill tone={caixaAberto ? 'success' : 'neutral'}>{caixaAberto ? 'caixa aberto' : 'aguardando abertura'}</LabStatusPill>}
      padding="md"
      title="Leitura do caixa"
    >
      <div className="space-y-0">
        <CaixaSignalRow label="receita" note="fechamentos já consolidados" tone="info" value={fmtBRL(kpis.receitaRealizada)} />
        <CaixaSignalRow label="lucro" note="resultado líquido realizado" tone={kpis.lucroRealizado >= 0 ? 'success' : 'danger'} value={fmtBRL(kpis.lucroRealizado)} />
        <CaixaSignalRow label="em aberto" note="valor ainda pendente de fechamento" tone={kpis.faturamentoAberto > 0 ? 'warning' : 'neutral'} value={fmtBRL(kpis.faturamentoAberto)} />
        <CaixaSignalRow label="esperado" note="referência de caixa para fechamento" tone="neutral" value={fmtBRL(kpis.caixaEsperado)} />
      </div>
    </LabPanel>
  )
}

function CaixaRadarPanel({
  caixaAberto,
  kpis,
}: Readonly<{
  caixaAberto: boolean
  kpis: ReturnType<typeof buildOperationsExecutiveKpis>
}>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{kpis.openComandasCount} comandas</LabStatusPill>}
      padding="md"
      title="Radar do turno"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_280px]">
        <div className="overflow-hidden rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)]">
          <div className="grid gap-px bg-[var(--lab-border)] sm:grid-cols-2 2xl:grid-cols-4">
            <CaixaStripStat label="projeção" value={fmtBRL(kpis.projecaoTotal)} />
            <CaixaStripStat label="caixa esperado" value={fmtBRL(kpis.caixaEsperado)} />
            <CaixaStripStat label="sessões" value={String(kpis.openSessionsCount)} />
            <CaixaStripStat label="status" value={caixaAberto ? 'aberto' : 'fechado'} />
          </div>
        </div>

        <div className="space-y-4 border-t border-dashed border-[var(--lab-border)] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <CaixaMetaRow label="status" tone={caixaAberto ? 'success' : 'neutral'} value={caixaAberto ? 'operando' : 'fechado'} />
          <CaixaMetaRow label="comandas abertas" tone={kpis.openComandasCount > 0 ? 'warning' : 'success'} value={String(kpis.openComandasCount)} />
          <CaixaMetaRow label="lucro esperado" tone={kpis.lucroEsperado >= 0 ? 'success' : 'danger'} value={fmtBRL(kpis.lucroEsperado)} />
          <CaixaMetaRow
            label="próxima ação"
            tone={resolveNextActionTone(kpis.openComandasCount, caixaAberto)}
            value={resolveNextActionLabel(kpis.openComandasCount, caixaAberto)}
          />
        </div>
      </div>
    </LabPanel>
  )
}

function resolveNextActionLabel(openComandasCount: number, caixaAberto: boolean) {
  if (openComandasCount > 0) {
    return 'fechar comandas'
  }

  if (caixaAberto) {
    return 'conferir e encerrar'
  }

  return 'abrir caixa'
}

function resolveNextActionTone(openComandasCount: number, caixaAberto: boolean): LabStatusTone {
  if (openComandasCount > 0) {
    return 'warning'
  }

  if (caixaAberto) {
    return 'success'
  }

  return 'info'
}

function CaixaSignalRow({
  label,
  note,
  tone,
  value,
}: Readonly<{
  label: string
  note: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--lab-fg)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{note}</p>
      </div>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

function CaixaMetaRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{label}</span>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

function CaixaStripStat({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="bg-[var(--lab-surface)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--lab-fg)]">{value}</p>
    </div>
  )
}
