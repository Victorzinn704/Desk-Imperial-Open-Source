import { LabPanel, LabStatusPill, LabTable } from '@/components/design-lab/lab-primitives'
import { buildEquipeDirectoryColumns } from './equipe-environment-directory-columns'
import type { EquipeDirectoryPanelProps } from './equipe-environment-panel.types'

export function EquipeDirectoryPanel({ currency, rows }: Readonly<EquipeDirectoryPanelProps>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{rows.length} registros</LabStatusPill>}
      padding="none"
      title="Diretorio operacional"
    >
      <LabTable
        dense
        className="rounded-none border-0"
        columns={buildEquipeDirectoryColumns(currency)}
        emptyDescription="Nao existe colaborador suficiente para montar o diretorio."
        emptyTitle="Equipe vazia"
        rowKey={(row) => row.employee.id}
        rows={rows}
      />
    </LabPanel>
  )
}
