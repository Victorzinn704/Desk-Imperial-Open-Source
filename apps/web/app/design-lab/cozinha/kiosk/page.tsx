'use client'

import Link from 'next/link'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChefHat } from 'lucide-react'
import { useDashboardSessionQuery } from '@/components/dashboard/hooks/useDashboardQueries'
import { KitchenOrdersView } from '@/components/staff-mobile/kitchen-orders-view'
import { ApiError, fetchOperationsKitchen } from '@/lib/api'
import { OPERATIONS_KITCHEN_QUERY_KEY } from '@/lib/operations'

export default function DesignLabCozinhaKioskPage() {
  const sessionQuery = useDashboardSessionQuery()
  const user = sessionQuery.data?.user
  const kitchenQuery = useQuery({
    queryKey: [...OPERATIONS_KITCHEN_QUERY_KEY, 'kiosk'],
    queryFn: () => fetchOperationsKitchen(),
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const errorMessage = kitchenQuery.error instanceof ApiError ? kitchenQuery.error.message : null

  if (sessionQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 py-10 text-[var(--text-primary)]">
        <div className="space-y-3 text-center">
          <ChefHat className="mx-auto size-10 text-[var(--accent,#008cff)]" />
          <p className="text-lg font-semibold">Carregando a cozinha</p>
          <p className="text-sm text-[var(--text-soft,#7a8896)]">Validando a sessão antes de abrir o modo kiosk.</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 py-10 text-[var(--text-primary)]">
        <div className="max-w-sm space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <ChefHat className="mx-auto size-10 text-[var(--accent,#008cff)]" />
          <div className="space-y-2">
            <p className="text-lg font-semibold">Sessão necessária</p>
            <p className="text-sm leading-6 text-[var(--text-soft,#7a8896)]">
              Entre no Desk Imperial para liberar a fila da cozinha no modo kiosk.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent,#008cff)] px-4 text-sm font-semibold text-[var(--on-accent)]"
              href="/login"
            >
              Entrar
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text-primary)]"
              href="/design-lab/cozinha"
            >
              Voltar para cozinha
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-3 py-3 text-[var(--text-primary)] sm:px-4">
      <section className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1280px] flex-col overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
              Cozinha kiosk
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">Fila viva do KDS</h1>
            <p className="mt-1 text-sm text-[var(--text-soft,#7a8896)]">
              Leitura contínua para preparo, avanço de status e saída de pratos.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent,#008cff)] hover:text-[var(--accent,#008cff)]"
              href="/design-lab/cozinha"
            >
              Voltar
            </Link>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <KitchenOrdersView
            currentEmployeeId={user.employeeId ?? null}
            data={kitchenQuery.data}
            errorMessage={errorMessage}
            isLoading={kitchenQuery.isLoading}
            queryKey={[...OPERATIONS_KITCHEN_QUERY_KEY, 'kiosk']}
          />
        </div>
      </section>
    </main>
  )
}
