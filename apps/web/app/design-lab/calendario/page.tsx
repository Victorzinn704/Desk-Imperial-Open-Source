'use client'

import Link from 'next/link'
import { CommercialCalendar } from '@/components/calendar/commercial-calendar'
import {
  LabFactPill,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import { useDashboardSessionQuery } from '@/components/dashboard/hooks/useDashboardQueries'

export default function DesignLabCalendarioPage() {
  const sessionQuery = useDashboardSessionQuery()
  const user = sessionQuery.data?.user

  return (
    <section className="space-y-6">
      <LabPageHeader
        eyebrow="Gestao comercial"
        title="Calendario comercial"
        description="Planejamento de jogos, promocoes, eventos e reunioes num recorte unico de agenda."
        actions={<LabStatusPill tone="info">planejamento</LabStatusPill>}
      />

      {sessionQuery.isLoading ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-fg-soft)]">Carregando sessão para abrir o calendário.</p>
        </LabPanel>
      ) : null}

      {!sessionQuery.isLoading && !user ? <CalendarioLockedState /> : null}

      {user ? <CommercialCalendar /> : null}
    </section>
  )
}

function CalendarioLockedState() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <LabPanel
        action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
        padding="md"
        title="Prévia travada da agenda"
      >
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <LabFactPill label="hoje" value="0" />
            <LabFactPill label="7 dias" value="2" />
            <LabFactPill label="próxima atividade" value="21/04 21:30" />
            <LabFactPill label="recorte" value="abril 2026" />
          </div>

          <div className="space-y-0">
            <LabSignalRow label="janelas do período" note="o login libera agenda completa por mês, semana, dia e lista" tone="info" value="ao entrar" />
            <LabSignalRow label="picos comerciais" note="jogos, promoções e eventos voltam a aparecer no mesmo calendário" tone="success" value="bloqueado" />
            <LabSignalRow label="planejamento" note="a leitura da próxima janela volta com impacto e tipo líder" tone="neutral" value="ao entrar" />
          </div>

          <div className="pt-1">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
              href="/login"
            >
              Entrar para liberar calendário
            </Link>
          </div>
        </div>
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="info">preview</LabStatusPill>}
        padding="md"
        title="O que abre na agenda"
      >
        <div className="space-y-0">
          <LabSignalRow label="mês, semana e dia" note="muda densidade conforme o tipo de leitura" tone="neutral" value="sim" />
          <LabSignalRow label="atividades do topo" note="próxima atividade, maior pico e tipo líder" tone="success" value="sim" />
          <LabSignalRow label="filtros" note="eventos, jogos, promoções, reuniões e outros" tone="info" value="sim" />
          <LabSignalRow label="agenda esportiva" note="janelas de jogo entram como leitura comercial do negócio" tone="warning" value="sim" />
        </div>
      </LabPanel>
    </div>
  )
}
