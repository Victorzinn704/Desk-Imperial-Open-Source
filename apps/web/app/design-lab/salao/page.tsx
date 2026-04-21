'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { buildDesignLabPdvHref } from '@/components/design-lab/design-lab-navigation'
import {
  LabFactPill,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import { useDashboardSessionQuery } from '@/components/dashboard/hooks/useDashboardQueries'
import type { View } from '@/components/dashboard/salao'
import { SalaoEnvironment } from '@/components/dashboard/salao-environment'

function DesignLabSalaoPageContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionQuery = useDashboardSessionQuery()
  const user = sessionQuery.data?.user
  const tab = searchParams.get('tab')
  const initialView =
    tab === 'planta' ? 'planta' : tab === 'configuracao' ? 'configuracao' : tab === 'comandas' ? 'comandas' : 'operacional'

  function handleViewChange(nextView: View) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', nextView)
    const nextUrl = `${pathname}?${params.toString()}`
    router.replace(nextUrl, { scroll: false })
  }

  if (sessionQuery.isLoading) {
    return (
      <section className="space-y-6">
        <LabPageHeader
          eyebrow="Gestão do salão"
          title="Salão"
          description="Ocupação, receita e giro de mesas."
        />

        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-fg-soft)]">Carregando sessão para abrir o salão.</p>
        </LabPanel>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="space-y-6">
        <LabPageHeader
          eyebrow="Gestão do salão"
          title="Salão"
          description="Ocupação, receita e giro de mesas."
        />

        <SalaoLockedState />
      </section>
    )
  }

  return (
    <SalaoEnvironment
      initialView={initialView}
      onViewChange={handleViewChange}
      onOpenPdvFromMesa={(intent) => {
        router.push(
          buildDesignLabPdvHref({
            tab: 'grid',
            comandaId: intent.comandaId,
            mesaId: intent.mesaId,
            mesaLabel: intent.mesaLabel,
          }),
        )
      }}
      surface="lab"
    />
  )
}

function SalaoLockedState() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <LabPanel
        action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
        padding="md"
        title="Prévia travada do salão"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <LabFactPill label="mesas" value="13" />
            <LabFactPill label="ocupadas" value="0" />
            <LabFactPill label="livres" value="13" />
            <LabFactPill label="visão" value="operacional" />
          </div>

          <div className="space-y-0">
            <LabSignalRow
              label="mapa de mesas"
              note="o login libera a leitura real de ocupação, mesa, garçom e comanda"
              tone="info"
              value="ao entrar"
            />
            <LabSignalRow
              label="atalho para PDV"
              note="mesa ocupada volta a abrir a comanda diretamente no fluxo de venda"
              tone="success"
              value="bloqueado"
            />
            <LabSignalRow
              label="planta baixa"
              note="a organização física do salão reaparece com posicionamento e setores"
              tone="neutral"
              value="disponível"
            />
            <LabSignalRow
              label="pressão do salão"
              note="ocupação, ticket aberto e giro ficam no topo da operação"
              tone="warning"
              value="autenticar"
            />
          </div>

          <div className="pt-1">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
              href="/login"
            >
              Entrar para liberar salão
            </Link>
          </div>
        </div>
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="info">preview</LabStatusPill>}
        padding="md"
        title="O que abre no salão"
      >
        <div className="space-y-0">
          <LabSignalRow label="operacional" note="grade viva das mesas e status de ocupação" tone="success" value="sim" />
          <LabSignalRow label="comandas" note="lista de comandas por mesa e acesso ao PDV" tone="info" value="sim" />
          <LabSignalRow label="configuração" note="criação, ativação e edição das mesas" tone="neutral" value="sim" />
          <LabSignalRow label="planta baixa" note="posicionamento visual do salão por setor" tone="warning" value="sim" />
        </div>
      </LabPanel>
    </div>
  )
}

export default function DesignLabSalaoPage() {
  return (
    <Suspense fallback={null}>
      <DesignLabSalaoPageContent />
    </Suspense>
  )
}
