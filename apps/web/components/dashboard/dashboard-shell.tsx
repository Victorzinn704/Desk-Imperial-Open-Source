'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  ChartColumnIncreasing,
  CircleDollarSign,
  FileCheck2,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  ShoppingCart,
  Tags,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react'
import type { ProductRecord } from '@contracts/contracts'
import {
  ApiError,
  archiveProduct,
  cancelOrder,
  createOrder,
  createProduct,
  fetchConsentOverview,
  fetchCurrentUser,
  fetchFinanceSummary,
  fetchOrders,
  fetchProducts,
  logout,
  restoreProduct,
  updateCookiePreferences,
  updateProduct,
} from '@/lib/api'
import type { OrderFormValues, ProductFormValues } from '@/lib/validation'
import { BrandMark } from '@/components/shared/brand-mark'
import { Button } from '@/components/shared/button'
import { CheckboxField } from '@/components/shared/checkbox-field'
import { FinanceChart } from '@/components/dashboard/finance-chart'
import { MetricCard } from '@/components/dashboard/metric-card'
import { OrderCard } from '@/components/dashboard/order-card'
import { OrderForm } from '@/components/dashboard/order-form'
import { ProductCard } from '@/components/dashboard/product-card'
import { ProductForm } from '@/components/dashboard/product-form'

const nextMilestones = [
  'Adicionar filtros de periodo e canal para ampliar os relatorios.',
  'Ligar pedidos a entregas, mapa e pendencias operacionais.',
  'Evoluir o financeiro para fechamento semanal e media mensal historica.',
]

export function DashboardShell() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isRouting, startTransition] = useTransition()
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)

  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
  })

  const consentQuery = useQuery({
    queryKey: ['consent', 'me'],
    queryFn: fetchConsentOverview,
    enabled: Boolean(sessionQuery.data?.user.userId),
    retry: false,
  })

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    enabled: Boolean(sessionQuery.data?.user.userId),
  })

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    enabled: Boolean(sessionQuery.data?.user.userId),
  })

  const financeQuery = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: fetchFinanceSummary,
    enabled: Boolean(sessionQuery.data?.user.userId),
  })

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.cancelQueries()
      queryClient.clear()
      startTransition(() => {
        router.push('/login')
      })
    },
  })

  const preferenceMutation = useMutation({
    mutationFn: updateCookiePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    },
  })

  const updateProductMutation = useMutation({
    mutationFn: ({ productId, values }: { productId: string; values: ProductFormValues }) =>
      updateProduct(productId, values),
    onSuccess: () => {
      setEditingProduct(null)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    },
  })

  const archiveProductMutation = useMutation({
    mutationFn: archiveProduct,
    onSuccess: () => {
      if (editingProduct) {
        setEditingProduct(null)
      }
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    },
  })

  const restoreProductMutation = useMutation({
    mutationFn: restoreProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    },
  })

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    },
  })

  const cancelOrderMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    },
  })

  const isUnauthorized = sessionQuery.error instanceof ApiError && sessionQuery.error.status === 401
  const sessionError =
    sessionQuery.error instanceof ApiError ? sessionQuery.error.message : 'Conecte a API e autentique a sessao para ver o painel.'

  if (sessionQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-6 py-8 text-[var(--text-primary)]">
        <div className="mx-auto max-w-7xl rounded-[36px] border border-[var(--border)] bg-[var(--surface)] p-10 shadow-[var(--shadow-panel)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Dashboard</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Carregando sessao autenticada...</h1>
        </div>
      </main>
    )
  }

  if (!sessionQuery.data?.user || isUnauthorized) {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-6 py-8 text-[var(--text-primary)]">
        <div className="mx-auto max-w-4xl rounded-[36px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-panel-strong)] sm:p-10">
          <BrandMark />
          <p className="mt-12 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Acesso necessario</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Sua sessao ainda nao esta ativa.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-soft)]">{sessionError}</p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link href="/login">
              <Button size="lg">Entrar</Button>
            </Link>
            <Link href="/cadastro">
              <Button size="lg" variant="secondary">
                Criar conta
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const user = sessionQuery.data.user
  const cookiePreferences = consentQuery.data?.cookiePreferences ?? user.cookiePreferences
  const legalAcceptances = consentQuery.data?.legalAcceptances ?? []
  const documentTitles = new Map(consentQuery.data?.documents.map((document) => [document.key, document.title]) ?? [])
  const products = productsQuery.data?.items ?? []
  const orders = ordersQuery.data?.items ?? []
  const finance = financeQuery.data

  const productsError = productsQuery.error instanceof ApiError ? productsQuery.error.message : null
  const ordersError = ordersQuery.error instanceof ApiError ? ordersQuery.error.message : null
  const financeError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null
  const mutationError = [
    createProductMutation.error,
    updateProductMutation.error,
    archiveProductMutation.error,
    restoreProductMutation.error,
    createOrderMutation.error,
    cancelOrderMutation.error,
  ].find((error) => error instanceof ApiError)

  const handleProductSubmit = (values: ProductFormValues) => {
    if (editingProduct) {
      updateProductMutation.mutate({
        productId: editingProduct.id,
        values,
      })
      return
    }

    createProductMutation.mutate(values)
  }

  const handleOrderSubmit = (values: OrderFormValues) => {
    createOrderMutation.mutate(values)
  }

  const productMutationBusy =
    createProductMutation.isPending ||
    updateProductMutation.isPending ||
    archiveProductMutation.isPending ||
    restoreProductMutation.isPending

  const orderMutationBusy = createOrderMutation.isPending || cancelOrderMutation.isPending

  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-8 text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-[32px] border border-[var(--border)] bg-[rgba(18,22,27,0.82)] p-5 shadow-[var(--shadow-panel)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <BrandMark />
            <div className="hidden h-8 w-px bg-[var(--border)] lg:block" />
            <div>
              <p className="text-sm text-[var(--text-soft)]">Area autenticada</p>
              <p className="text-lg font-semibold text-white">Painel operacional com vendas e portfolio</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/">
              <Button variant="ghost">Voltar ao site</Button>
            </Link>
            <Button loading={logoutMutation.isPending || isRouting} onClick={() => logoutMutation.mutate()} variant="secondary">
              <LogOut className="size-4" />
              Encerrar sessao
            </Button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-4">
          <MetricCard
            hint={user.companyName || 'Empresa ainda nao informada'}
            icon={UserRound}
            label="Conta"
            value={user.fullName}
          />
          <MetricCard
            hint="Status da identidade no portal"
            icon={ShieldCheck}
            label="Status"
            value={user.status}
          />
          <MetricCard
            hint="Produtos ativos com sessao autenticada"
            icon={Box}
            label="Portfolio"
            value={String(productsQuery.data?.totals.activeProducts ?? 0)}
          />
          <MetricCard
            hint="Pedidos concluidos considerados no financeiro"
            icon={ShoppingCart}
            label="Pedidos"
            value={String(ordersQuery.data?.totals.completedOrders ?? 0)}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[36px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(18,22,27,0.96),rgba(12,15,19,0.96))] p-8 shadow-[var(--shadow-panel-strong)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Financeiro consolidado</p>
            <h1 className="mt-4 text-4xl font-semibold text-white">Agora o painel mistura estoque e venda real.</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-soft)]">
              Os indicadores abaixo combinam potencial do portfolio, receita realizada e comparativo mensal da operacao.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                hint="Receita confirmada em pedidos concluidos"
                icon={CircleDollarSign}
                label="Receita realizada"
                value={formatCurrency(finance?.totals.realizedRevenue ?? 0)}
              />
              <MetricCard
                hint="Lucro dos pedidos ja registrados"
                icon={TrendingUp}
                label="Lucro realizado"
                value={formatCurrency(finance?.totals.realizedProfit ?? 0)}
              />
              <MetricCard
                hint="Receita do mes corrente"
                icon={Wallet}
                label="Mes atual"
                value={formatCurrency(finance?.totals.currentMonthRevenue ?? 0)}
              />
              <MetricCard
                hint="Comparativo de receita vs mes anterior"
                icon={ChartColumnIncreasing}
                label="Crescimento de receita"
                value={formatPercent(finance?.totals.revenueGrowthPercent ?? 0)}
              />
              <MetricCard
                hint="Valor atual investido no estoque"
                icon={Box}
                label="Estoque"
                value={formatCurrency(finance?.totals.inventoryCostValue ?? 0)}
              />
              <MetricCard
                hint="Lucro potencial restante no portfolio"
                icon={Tags}
                label="Lucro potencial"
                value={formatCurrency(finance?.totals.potentialProfit ?? 0)}
              />
            </div>

            {financeError ? <p className="mt-4 text-sm text-[var(--danger)]">{financeError}</p> : null}
          </article>

          <aside className="rounded-[36px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-panel)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Proximas entregas</p>
            <div className="mt-6 space-y-4">
              {nextMilestones.map((item) => (
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm leading-7 text-[var(--text-soft)]" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </aside>
        </section>

        <FinanceChart
          error={financeError}
          finance={finance}
          isLoading={financeQuery.isLoading}
          ordersTotals={ordersQuery.data?.totals}
        />

        <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <OrderForm loading={createOrderMutation.isPending} onSubmit={handleOrderSubmit} products={products.filter((product) => product.active)} />

          <article className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
                <ShoppingCart className="size-5" />
              </span>
              <div>
                <p className="text-sm text-[var(--text-soft)]">Vendas recentes</p>
                <h2 className="text-xl font-semibold text-white">Pedidos que alimentam o financeiro</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <MetricCard
                hint="Pedidos concluidos"
                icon={ShoppingCart}
                label="Concluidos"
                value={String(ordersQuery.data?.totals.completedOrders ?? 0)}
              />
              <MetricCard
                hint="Pedidos cancelados"
                icon={LockKeyhole}
                label="Cancelados"
                value={String(ordersQuery.data?.totals.cancelledOrders ?? 0)}
              />
              <MetricCard
                hint="Unidades vendidas"
                icon={Tags}
                label="Itens vendidos"
                value={String(ordersQuery.data?.totals.soldUnits ?? 0)}
              />
            </div>

            {ordersError ? <p className="mt-4 text-sm text-[var(--danger)]">{ordersError}</p> : null}

            <div className="mt-6 space-y-4">
              {orders.length ? (
                orders.map((order) => (
                  <OrderCard busy={orderMutationBusy} key={order.id} onCancel={(orderId) => cancelOrderMutation.mutate(orderId)} order={order} />
                ))
              ) : (
                <p className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
                  Nenhuma venda registrada ainda. Use o formulario ao lado para criar o primeiro pedido.
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <ProductForm
            loading={createProductMutation.isPending || updateProductMutation.isPending}
            onCancelEdit={() => setEditingProduct(null)}
            onSubmit={handleProductSubmit}
            product={editingProduct}
          />

          <article className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
                <Tags className="size-5" />
              </span>
              <div>
                <p className="text-sm text-[var(--text-soft)]">Categorias</p>
                <h2 className="text-xl font-semibold text-white">Breakdown por carteira</h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {finance?.categoryBreakdown.length ? (
                finance.categoryBreakdown.map((item) => (
                  <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] p-4" key={item.category}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{item.category}</p>
                        <p className="mt-1 text-sm text-[var(--text-soft)]">
                          {item.products} produto(s) e {item.units} unidade(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{formatCurrency(item.potentialProfit)}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">lucro potencial</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
                  Cadastre produtos para destravar a leitura por categoria e as simulacoes financeiras.
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
                <FileCheck2 className="size-5" />
              </span>
              <div>
                <p className="text-sm text-[var(--text-soft)]">Consentimento</p>
                <h2 className="text-xl font-semibold text-white">Documentos aceitos</h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {legalAcceptances.length ? (
                legalAcceptances.map((acceptance) => (
                  <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3" key={acceptance.key}>
                    <p className="font-medium text-[var(--text-primary)]">{documentTitles.get(acceptance.key) ?? acceptance.key}</p>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      Aceito em {new Date(acceptance.acceptedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
                  Os documentos legais aparecerao aqui assim que houver consentimento registrado na sessao do usuario.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(212,177,106,0.08)] text-[var(--accent)]">
                <ChartColumnIncreasing className="size-5" />
              </span>
              <div>
                <p className="text-sm text-[var(--text-soft)]">Preferencias</p>
                <h2 className="text-xl font-semibold text-white">Gestao de cookies opcionais</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <CheckboxField
                checked={cookiePreferences.analytics}
                description="Permite medir uso e desempenho da plataforma."
                disabled={preferenceMutation.isPending || consentQuery.isLoading}
                label="Cookies analiticos"
                onChange={(event) =>
                  preferenceMutation.mutate({
                    analytics: event.currentTarget.checked,
                    marketing: cookiePreferences.marketing,
                  })
                }
              />

              <CheckboxField
                checked={cookiePreferences.marketing}
                description="Mantem a base pronta para comunicacao promocional controlada pelo usuario."
                disabled={preferenceMutation.isPending || consentQuery.isLoading}
                label="Cookies de marketing"
                onChange={(event) =>
                  preferenceMutation.mutate({
                    analytics: cookiePreferences.analytics,
                    marketing: event.currentTarget.checked,
                  })
                }
              />
            </div>

            {preferenceMutation.error instanceof ApiError ? (
              <p className="mt-4 text-sm text-[var(--danger)]">{preferenceMutation.error.message}</p>
            ) : null}
          </article>
        </section>

        <section className="rounded-[36px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-panel)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Portfolio</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Produtos cadastrados na operacao</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
                O painel abaixo mostra o cadastro atual da conta autenticada e alimenta tanto o potencial financeiro quanto as vendas futuras.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
              {productsQuery.data
                ? `${productsQuery.data.totals.totalProducts} produto(s) no total, ${productsQuery.data.totals.activeProducts} ativo(s)`
                : 'Carregando portfolio...'}
            </div>
          </div>

          {productsError ? <p className="mt-5 text-sm text-[var(--danger)]">{productsError}</p> : null}
          {mutationError instanceof ApiError ? <p className="mt-5 text-sm text-[var(--danger)]">{mutationError.message}</p> : null}

          <div className="mt-8 space-y-4">
            {products.length ? (
              products.map((product) => (
                <ProductCard
                  busy={productMutationBusy}
                  key={product.id}
                  onArchive={(productId) => archiveProductMutation.mutate(productId)}
                  onEdit={(selectedProduct) => setEditingProduct(selectedProduct)}
                  onRestore={(productId) => restoreProductMutation.mutate(productId)}
                  product={product}
                />
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-5 py-12 text-center">
                <p className="text-lg font-semibold text-white">Nenhum produto cadastrado ainda.</p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  Use o formulario acima para criar os primeiros itens do seu portfolio e destravar o resumo financeiro.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}
