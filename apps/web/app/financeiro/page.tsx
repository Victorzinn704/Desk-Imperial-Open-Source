import { redirect } from 'next/navigation'
import {
  buildDesignLabFinanceiroHref,
  parseDesignLabFinanceiroTab,
} from '@/components/design-lab/design-lab-navigation'

type FinanceiroShortcutPageProps = {
  searchParams?: Promise<{
    tab?: string
  }>
}

export default async function FinanceiroShortcutPage({ searchParams }: Readonly<FinanceiroShortcutPageProps>) {
  const params = (await searchParams) ?? {}
  redirect(buildDesignLabFinanceiroHref(parseDesignLabFinanceiroTab(params.tab)))
}
