import { useMemo, useState } from 'react'
import { Armchair } from 'lucide-react'
import type { Comanda, Mesa } from '@/components/pdv/pdv-types'
import { ModernOperacionalCard } from './salao'
import { FilterChip } from './salao-filter-chip'
import { buildSectionStats, filterMesasBySection, getSectionTone, resolveMesaUrgency } from './salao-environment.model'

const OPERACIONAL_LOADING_CARD_KEYS = [
  'loading-1',
  'loading-2',
  'loading-3',
  'loading-4',
  'loading-5',
  'loading-6',
  'loading-7',
  'loading-8',
  'loading-9',
  'loading-10',
]

export function OperacionalView({
  garcomNames,
  isLoading,
  liveComandas,
  liveMesas,
  onOpenPdvFromMesa,
  referenceTime,
}: Readonly<{
  garcomNames: Record<string, string>
  isLoading: boolean
  liveComandas: Comanda[]
  liveMesas: Mesa[]
  onOpenPdvFromMesa?: (mesa: Mesa) => void
  referenceTime: number
}>) {
  const [sectionFilter, setSectionFilter] = useState('all')
  const sectionPills = useMemo(() => buildSectionStats(liveMesas), [liveMesas])
  const visibleMesas = useMemo(() => filterMesasBySection(liveMesas, sectionFilter), [liveMesas, sectionFilter])

  if (isLoading) {
    return <OperacionalLoadingView />
  }

  if (liveMesas.length === 0) {
    return <OperacionalEmptyView />
  }

  return (
    <div className="space-y-5">
      <OperacionalSectionFilters
        liveMesas={liveMesas}
        sectionFilter={sectionFilter}
        sectionPills={sectionPills}
        visibleCount={visibleMesas.length}
        onSectionChange={setSectionFilter}
      />
      <OperacionalCardGrid
        garcomNames={garcomNames}
        liveComandas={liveComandas}
        referenceTime={referenceTime}
        visibleMesas={visibleMesas}
        onOpenPdvFromMesa={onOpenPdvFromMesa}
      />
      {visibleMesas.length === 0 ? <OperacionalSectionEmptyView /> : null}
    </div>
  )
}

function OperacionalLoadingView() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {OPERACIONAL_LOADING_CARD_KEYS.map((key) => (
        <div className="h-32 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" key={key} />
      ))}
    </div>
  )
}

function OperacionalEmptyView() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-soft)]">
        <Armchair className="size-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Nenhuma mesa ativa no salão</h3>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        Crie mesas na aba de configuração para liberar a leitura operacional.
      </p>
    </div>
  )
}

function OperacionalSectionFilters({
  liveMesas,
  onSectionChange,
  sectionFilter,
  sectionPills,
  visibleCount,
}: Readonly<{
  liveMesas: Mesa[]
  onSectionChange: (section: string) => void
  sectionFilter: string
  sectionPills: ReturnType<typeof buildSectionStats>
  visibleCount: number
}>) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <OperacionalSectionHeader visibleCount={visibleCount} />
      <div className="mt-4 flex flex-wrap gap-2.5">
        <FilterChip
          active={sectionFilter === 'all'}
          label={`Salão inteiro · ${liveMesas.length}`}
          tone="info"
          onClick={() => onSectionChange('all')}
        />
        {sectionPills.map((section) => (
          <FilterChip
            active={sectionFilter === section.label}
            key={section.label}
            label={`${section.label} · ${section.occupied}/${section.total}`}
            tone={getSectionTone(section)}
            onClick={() => onSectionChange(section.label)}
          />
        ))}
      </div>
    </div>
  )
}

function OperacionalSectionHeader({ visibleCount }: Readonly<{ visibleCount: number }>) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Leitura por setor
        </p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
          Filtre a área do salão que merece atenção agora
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
          O foco por setor evita grade morta e acelera a leitura de pressão operacional antes de abrir o PDV.
        </p>
      </div>
      <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
        {visibleCount} mesas no recorte atual
      </span>
    </div>
  )
}

function OperacionalCardGrid({
  garcomNames,
  liveComandas,
  onOpenPdvFromMesa,
  referenceTime,
  visibleMesas,
}: Readonly<{
  garcomNames: Record<string, string>
  liveComandas: Comanda[]
  onOpenPdvFromMesa?: (mesa: Mesa) => void
  referenceTime: number
  visibleMesas: Mesa[]
}>) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {visibleMesas.map((mesa) => (
        <OperacionalMesaCard
          garcomNames={garcomNames}
          key={mesa.id}
          liveComandas={liveComandas}
          mesa={mesa}
          referenceTime={referenceTime}
          onOpenPdvFromMesa={onOpenPdvFromMesa}
        />
      ))}
    </div>
  )
}

function OperacionalMesaCard({
  garcomNames,
  liveComandas,
  mesa,
  onOpenPdvFromMesa,
  referenceTime,
}: Readonly<{
  garcomNames: Record<string, string>
  liveComandas: Comanda[]
  mesa: Mesa
  onOpenPdvFromMesa?: (mesa: Mesa) => void
  referenceTime: number
}>) {
  const comanda = mesa.comandaId ? liveComandas.find((current) => current.id === mesa.comandaId) : undefined

  return (
    <ModernOperacionalCard
      comanda={comanda}
      garcomName={mesa.garcomId ? garcomNames[mesa.garcomId] : undefined}
      mesa={mesa}
      urgency={resolveMesaUrgency({ comanda, mesa, referenceTime })}
      onClick={onOpenPdvFromMesa ? () => onOpenPdvFromMesa(mesa) : undefined}
    />
  )
}

function OperacionalSectionEmptyView() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Nenhuma mesa nesse setor agora</h3>
      <p className="mt-2 text-sm text-[var(--text-soft)]">
        Troque o recorte ou volte para o salão inteiro para enxergar o restante da operação.
      </p>
    </div>
  )
}
