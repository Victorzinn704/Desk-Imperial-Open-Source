import { LabStatusPill } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import type { EquipeCurrency, EquipeRow } from './equipe-environment.types'

export function buildEquipeDirectoryColumns(currency: EquipeCurrency) {
  return [
    buildEquipeNameColumn(),
    buildEquipeStatusColumn(),
    buildEquipeAccessColumn(),
    buildEquipeMoneyColumn('salario', 'Salario base', (row) => row.baseSalary, currency, '140px'),
    buildEquipeMutedMoneyColumn('receita', 'Receita', (row) => row.revenue, currency, '140px'),
    buildEquipeOrdersColumn(),
    buildEquipeMutedMoneyColumn('ticket', 'Ticket medio', (row) => row.averageTicket, currency, '140px'),
    buildEquipeMoneyColumn('pagamento', 'Pagamento estimado', (row) => row.payout, currency, '160px'),
  ]
}

function buildEquipeNameColumn() {
  return {
    id: 'colaborador',
    header: 'Colaborador',
    cell: (row: EquipeRow) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-[var(--lab-fg)]">{row.employee.displayName}</p>
        <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{row.employee.employeeCode}</p>
      </div>
    ),
  }
}

function buildEquipeStatusColumn() {
  return {
    id: 'status',
    header: 'Status',
    cell: (row: EquipeRow) => (
      <LabStatusPill tone={row.employee.active ? 'success' : 'neutral'}>
        {row.employee.active ? 'ativo' : 'inativo'}
      </LabStatusPill>
    ),
    width: '120px',
  }
}

function buildEquipeAccessColumn() {
  return {
    id: 'acesso',
    header: 'Acesso',
    cell: (row: EquipeRow) => (
      <LabStatusPill tone={row.employee.hasLogin ? 'info' : 'neutral'}>
        {row.employee.hasLogin ? 'habilitado' : 'pendente'}
      </LabStatusPill>
    ),
    width: '130px',
  }
}

function buildEquipeMoneyColumn(
  id: string,
  header: string,
  valueGetter: (row: EquipeRow) => number,
  currency: EquipeCurrency,
  width: string,
) {
  return {
    id,
    header,
    align: 'right' as const,
    cell: (row: EquipeRow) => (
      <span className="font-medium text-[var(--lab-fg)]">{formatCurrency(valueGetter(row), currency)}</span>
    ),
    width,
  }
}

function buildEquipeMutedMoneyColumn(
  id: string,
  header: string,
  valueGetter: (row: EquipeRow) => number,
  currency: EquipeCurrency,
  width: string,
) {
  return {
    id,
    header,
    align: 'right' as const,
    cell: (row: EquipeRow) => (
      <span className="text-[var(--lab-fg-soft)]">{formatCurrency(valueGetter(row), currency)}</span>
    ),
    width,
  }
}

function buildEquipeOrdersColumn() {
  return {
    id: 'pedidos',
    header: 'Pedidos',
    align: 'right' as const,
    cell: (row: EquipeRow) => <span className="text-[var(--lab-fg-soft)]">{row.orders}</span>,
    width: '90px',
  }
}
