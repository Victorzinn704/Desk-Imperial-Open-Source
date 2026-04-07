import { notFound } from 'next/navigation'
import { DeskCommandCenterPrototype } from '@/components/design-lab/desk-command-center-prototype'

export default function DesignLabPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <DeskCommandCenterPrototype />
}
