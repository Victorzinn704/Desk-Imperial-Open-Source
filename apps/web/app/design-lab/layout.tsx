import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { LabShell } from '@/components/design-lab/lab-shell'
import './lab.css'

export default function DesignLabLayout({ children }: { children: ReactNode }) {
  const designLabDisabled =
    process.env.DISABLE_DESIGN_LAB === '1' || process.env.NEXT_PUBLIC_DISABLE_DESIGN_LAB === '1'

  if (designLabDisabled) {
    notFound()
  }

  return <LabShell>{children}</LabShell>
}
