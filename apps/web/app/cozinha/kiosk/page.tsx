import { redirect } from 'next/navigation'
import { buildDesignLabCozinhaKioskHref } from '@/components/design-lab/design-lab-navigation'

export default function CozinhaKioskAliasPage() {
  redirect(buildDesignLabCozinhaKioskHref())
}
