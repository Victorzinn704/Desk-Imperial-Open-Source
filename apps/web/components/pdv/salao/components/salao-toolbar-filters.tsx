import { AlertCircle, Zap } from 'lucide-react'
import type { FilterStatus } from '../constants'
import { FilterChip } from './filter-chip'

type SalaoToolbarFiltersProps = {
  comAtencao: number
  filter: FilterStatus
  livres: number
  mesasCount: number
  ocupadas: number
  semGarcom: number
  setFilter: (filter: FilterStatus) => void
}

const BASE_FILTER_ITEMS: ReadonlyArray<{
  color: string
  key: Extract<FilterStatus, 'livre' | 'ocupada' | 'todos'>
  label: string
  readCount: (counts: { livres: number; mesasCount: number; ocupadas: number }) => number
}> = [
  { key: 'todos', label: 'Todos', color: '#7a8896', readCount: (counts) => counts.mesasCount },
  { key: 'livre', label: 'Livres', color: '#36f57c', readCount: (counts) => counts.livres },
  { key: 'ocupada', label: 'Ocupadas', color: '#f87171', readCount: (counts) => counts.ocupadas },
]

function buildOptionalFilterItems({
  comAtencao,
  semGarcom,
}: Readonly<{
  comAtencao: number
  semGarcom: number
}>) {
  return [
    semGarcom > 0
      ? {
          key: 'sem_garcom' as const,
          label: 'Sem garçom',
          color: '#fbbf24',
          count: semGarcom,
          icon: <AlertCircle className="size-3" />,
        }
      : null,
    comAtencao > 0
      ? {
          key: 'atencao' as const,
          label: 'Atenção',
          color: '#f87171',
          count: comAtencao,
          icon: <Zap className="size-3" />,
        }
      : null,
  ].filter((item) => item !== null)
}

export function SalaoToolbarFilters({
  comAtencao,
  filter,
  livres,
  mesasCount,
  ocupadas,
  semGarcom,
  setFilter,
}: Readonly<SalaoToolbarFiltersProps>) {
  const counts = { livres, mesasCount, ocupadas }
  const optionalItems = buildOptionalFilterItems({ comAtencao, semGarcom })

  return (
    <div className="flex flex-wrap gap-2">
      {BASE_FILTER_ITEMS.map((item) => (
        <FilterChip
          active={filter === item.key}
          color={item.color}
          count={item.readCount(counts)}
          key={item.key}
          label={item.label}
          onClick={() => setFilter(item.key)}
        />
      ))}
      {optionalItems.map((item) => (
        <FilterChip
          active={filter === item.key}
          color={item.color}
          count={item.count}
          icon={item.icon}
          key={item.key}
          label={item.label}
          onClick={() => setFilter(item.key)}
        />
      ))}
    </div>
  )
}
