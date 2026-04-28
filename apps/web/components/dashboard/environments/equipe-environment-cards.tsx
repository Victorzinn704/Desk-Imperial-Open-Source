import { BadgeDollarSign, ShieldCheck, Users, Wallet } from 'lucide-react'
import { LAB_RESPONSIVE_FOUR_UP_GRID } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { EquipeEmptyState } from './equipe-environment-empty-state'
import {
  EquipeDirectoryPanel,
  EquipePeriodPanel,
  EquipeRadarPanel,
  EquipeRankingPanel,
  EquipeSignalsPanel,
} from './equipe-environment-panels'
import { EquipeMetricTile } from './equipe-environment-shared'
import type { EquipeCurrency, EquipeRow, EquipeSurface } from './equipe-environment.types'

export function EquipeCardsView({
  averageTicket,
  currency,
  highlightedRow,
  rows,
  surface,
  totalCommission,
}: Readonly<{
  averageTicket: number
  currency: EquipeCurrency
  highlightedRow: EquipeRow | null
  rows: EquipeRow[]
  surface: EquipeSurface
  totalCommission: number
}>) {
  const showLabEmptyState = surface === 'lab' && rows.length === 0
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0)
  const totalPayout = rows.reduce((sum, row) => sum + row.payout, 0)

  return (
    <>
      {surface === 'legacy' ? (
        <EquipeLegacyMetrics currency={currency} rows={rows} totalPayout={totalPayout} totalRevenue={totalRevenue} />
      ) : null}
      {showLabEmptyState ? (
        <EquipeEmptyState currency={currency} totalPayout={totalPayout} totalRevenue={totalRevenue} />
      ) : (
        <EquipeOverviewPanels
          averageTicket={averageTicket}
          currency={currency}
          highlightedRow={highlightedRow}
          rows={rows}
          surface={surface}
          totalCommission={totalCommission}
          totalPayout={totalPayout}
          totalRevenue={totalRevenue}
        />
      )}
    </>
  )
}

function EquipeLegacyMetrics({
  currency,
  rows,
  totalPayout,
  totalRevenue,
}: Readonly<{
  currency: EquipeCurrency
  rows: EquipeRow[]
  totalPayout: number
  totalRevenue: number
}>) {
  const loginCoverage = rows.length > 0 ? (rows.filter((row) => row.employee.hasLogin).length / rows.length) * 100 : 0

  return (
    <div className={`grid gap-4 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
      <EquipeMetricTile
        hint="colaboradores ativos no workspace"
        icon={Users}
        label="ativos"
        progress={rows.length > 0 ? 100 : 0}
        value={String(rows.length)}
      />
      <EquipeMetricTile
        hint="receita atribuida no consolidado atual"
        icon={BadgeDollarSign}
        label="receita atribuida"
        tone={totalRevenue > 0 ? 'success' : 'neutral'}
        value={formatCurrency(totalRevenue, currency)}
      />
      <EquipeMetricTile
        hint="valor estimado entre salario base e comissao"
        icon={Wallet}
        label="folha estimada"
        tone="info"
        value={formatCurrency(totalPayout, currency)}
      />
      <EquipeMetricTile
        hint="cobertura de acesso no desktop"
        icon={ShieldCheck}
        label="acesso habilitado"
        progress={loginCoverage}
        tone={loginCoverage >= 80 ? 'success' : 'warning'}
        value={rows.length > 0 ? `${rows.filter((row) => row.employee.hasLogin).length}/${rows.length}` : '0/0'}
      />
    </div>
  )
}

function EquipeOverviewPanels({
  averageTicket,
  currency,
  highlightedRow,
  rows,
  surface,
  totalCommission,
  totalPayout,
  totalRevenue,
}: Readonly<{
  averageTicket: number
  currency: EquipeCurrency
  highlightedRow: EquipeRow | null
  rows: EquipeRow[]
  surface: EquipeSurface
  totalCommission: number
  totalPayout: number
  totalRevenue: number
}>) {
  return (
    <>
      {surface === 'lab' ? (
        <EquipeLabOverviewGrid
          averageTicket={averageTicket}
          currency={currency}
          highlightedRow={highlightedRow}
          rows={rows}
          totalCommission={totalCommission}
          totalPayout={totalPayout}
          totalRevenue={totalRevenue}
        />
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <EquipeRankingPanel currency={currency} rows={rows} />
        <EquipeSignalsPanel
          averageTicket={averageTicket}
          currency={currency}
          rows={rows}
          totalCommission={totalCommission}
        />
      </div>
      <EquipeDirectoryPanel currency={currency} rows={rows} />
    </>
  )
}

function EquipeLabOverviewGrid(
  props: Readonly<{
    averageTicket: number
    currency: EquipeCurrency
    highlightedRow: EquipeRow | null
    rows: EquipeRow[]
    totalCommission: number
    totalPayout: number
    totalRevenue: number
  }>,
) {
  return (
    <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)] xl:items-start">
      <EquipePeriodPanel
        averageTicket={props.averageTicket}
        currency={props.currency}
        highlightedRow={props.highlightedRow}
        rows={props.rows}
        totalPayout={props.totalPayout}
        totalRevenue={props.totalRevenue}
      />
      <EquipeRadarPanel
        averageTicket={props.averageTicket}
        currency={props.currency}
        highlightedRow={props.highlightedRow}
        rows={props.rows}
        totalCommission={props.totalCommission}
      />
    </div>
  )
}
