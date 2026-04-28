import { LayoutGrid, Users2 } from 'lucide-react'
import type { SalaoView } from '../constants'
import { ViewBtn } from './view-btn'

type SalaoToolbarViewToggleProps = {
  setView: (view: SalaoView) => void
  view: SalaoView
}

export function SalaoToolbarViewToggle({ setView, view }: Readonly<SalaoToolbarViewToggleProps>) {
  return (
    <div className="flex rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] p-0.5">
      <ViewBtn
        active={view === 'salao'}
        icon={<LayoutGrid className="size-3.5" />}
        label="Salão"
        onClick={() => setView('salao')}
      />
      <ViewBtn
        active={view === 'equipe'}
        icon={<Users2 className="size-3.5" />}
        label="Equipe"
        onClick={() => setView('equipe')}
      />
    </div>
  )
}
