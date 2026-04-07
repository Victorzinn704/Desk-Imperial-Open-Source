import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { LabShell } from '@/components/design-lab/lab-shell'
import './lab.css'

export default function DesignLabLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <LabShell>{children}</LabShell>
}
