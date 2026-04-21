'use client'

import { type InputHTMLAttributes, useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  CloudOff,
  PackagePlus,
  RefreshCcw,
  ScanLine,
  TriangleAlert,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import { OwnerBarcodeScannerSheet } from '@/components/owner-mobile/owner-barcode-scanner-sheet'
import { useOfflineQueue } from '@/components/shared/use-offline-queue'
import { ApiError, fetchProducts, lookupBarcodeCatalog, type BarcodeCatalogLookupResponse } from '@/lib/api'
import { formatBRL as formatCurrency } from '@/lib/currency'
import { currencyCodeSchema } from '@/lib/validation'

const barcodeLengths = new Set([8, 12, 13, 14])

const ownerQuickRegisterSchema = z
  .object({
    name: z.string().trim().min(2, 'Digite um nome de produto válido.').max(120, 'O nome ficou longo demais.'),
    brand: z.string().trim().max(80, 'A marca ficou longa demais.').optional().or(z.literal('')),
    category: z.string().trim().min(2, 'Informe uma categoria.').max(80, 'A categoria ficou longa demais.'),
    unitCost: z.coerce.number().min(0, 'O custo não pode ser negativo.'),
    unitPrice: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
    stockBaseUnits: z.coerce.number().int('Use um número inteiro.').min(0, 'O estoque não pode ser negativo.'),
    currency: currencyCodeSchema.default('BRL'),
  })
  .transform((values) => ({
    name: values.name,
    brand: values.brand,
    category: values.category,
    packagingClass: 'Cadastro rápido móvel',
    measurementUnit: 'UN',
    measurementValue: 1,
    unitsPerPackage: 1,
    unitCost: values.unitCost,
    unitPrice: values.unitPrice,
    currency: values.currency,
    stock: values.stockBaseUnits,
    description: '',
    requiresKitchen: false,
    lowStockThreshold: null,
  }))

type OwnerQuickRegisterInput = z.input<typeof ownerQuickRegisterSchema>
type OwnerQuickRegisterValues = z.output<typeof ownerQuickRegisterSchema>
type OwnerQueuedProductPayload = OwnerQuickRegisterValues & { barcode?: string }
type LookupFeedbackTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const defaultValues: OwnerQuickRegisterInput = {
  name: '',
  brand: '',
  category: '',
  unitCost: 0,
  unitPrice: 0,
  stockBaseUnits: 0,
  currency: 'BRL',
}

export function OwnerQuickRegisterView({
  companyName,
  displayName,
  onBack,
}: Readonly<{
  companyName: string
  displayName: string
  onBack: () => void
}>) {
  const { createProductMutation, queryClient } = useDashboardMutations()
  const { enqueue, drainQueue, listQueue } = useOfflineQueue()
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
  const lookupMutation = useMutation({
    mutationFn: lookupBarcodeCatalog,
  })
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)
  const [lookupFeedback, setLookupFeedback] = useState<{ tone: LookupFeedbackTone; message: string } | null>(null)
  const [lookupContext, setLookupContext] = useState<BarcodeCatalogLookupResponse | null>(null)
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OwnerQuickRegisterInput, undefined, OwnerQuickRegisterValues>({
    resolver: zodResolver(ownerQuickRegisterSchema),
    defaultValues,
  })

  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data?.items])
  const totals = productsQuery.data?.totals
  const normalizedBarcode = barcodeInput.replace(/\D/g, '')
  const barcodeValid = normalizedBarcode.length === 0 ? false : barcodeLengths.has(normalizedBarcode.length)
  const duplicatedProduct = useMemo(
    () => (barcodeValid ? products.find((product) => product.barcode === normalizedBarcode) ?? null : null),
    [barcodeValid, normalizedBarcode, products],
  )
  const recentProducts = useMemo(
    () =>
      [...products]
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
        .slice(0, 6),
    [products],
  )

  const stockBaseUnits = watch('stockBaseUnits')
  const createError = createProductMutation.error instanceof Error ? createProductMutation.error.message : null
  const productsError = productsQuery.error instanceof Error ? productsQuery.error.message : null
  const categoriesCount = totals?.categories.length ?? new Set(products.map((product) => product.category)).size
  const lowStockCount = products.filter((product) => product.isLowStock).length
  const canSubmit = !createProductMutation.isPending && !duplicatedProduct && (normalizedBarcode.length === 0 || barcodeValid)
  const canLookup = barcodeValid && !duplicatedProduct && !lookupMutation.isPending

  const refreshQueuedCount = useCallback(async () => {
    const queue = await listQueue()
    setQueuedCount(queue.filter((entry) => entry.type === 'owner.create-product').length)
  }, [listQueue])

  const runDrain = useCallback(async () => {
    const result = await drainQueue(async (action) => {
      if (action.type !== 'owner.create-product') {
        return
      }

      try {
        await createProductMutation.mutateAsync(action.payload as OwnerQueuedProductPayload)
      } catch (error) {
        if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
          createProductMutation.reset()
          return
        }
        throw error
      }
    })

    if (result.expiredCount > 0) {
      toast.error(
        result.expiredCount === 1
          ? '1 cadastro offline expirou apos 10 minutos sem conexao e foi descartado.'
          : `${result.expiredCount} cadastros offline expiraram apos 10 minutos sem conexao e foram descartados.`,
      )
    }

    if (result.processedCount > 0) {
      toast.success(
        result.processedCount === 1
          ? '1 produto offline foi sincronizado.'
          : `${result.processedCount} produtos offline foram sincronizados.`,
      )
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    }

    await refreshQueuedCount()
    return result
  }, [createProductMutation, drainQueue, queryClient, refreshQueuedCount])

  useEffect(() => {
    void refreshQueuedCount()
  }, [refreshQueuedCount])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      void runDrain()
    }
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (navigator.onLine) {
      void runDrain()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [runDrain])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'DRAIN_QUEUE') {
        void runDrain()
      }
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [runDrain])

  const applyLookupValues = useCallback(
    (
      lookup: {
        name: string | null
        brand: string | null
        category: string | null
      },
      mode: 'empty-only' | 'overwrite',
    ) => {
      let appliedCount = 0
      const shouldOverwrite = mode === 'overwrite'

      const currentName = (getValues('name') ?? '').trim()
      if (lookup.name && (shouldOverwrite || currentName.length === 0)) {
        setValue('name', lookup.name, { shouldDirty: shouldOverwrite, shouldTouch: true })
        appliedCount += 1
      }

      const currentBrand = (getValues('brand') ?? '').trim()
      if (lookup.brand && (shouldOverwrite || currentBrand.length === 0)) {
        setValue('brand', lookup.brand, { shouldDirty: shouldOverwrite, shouldTouch: true })
        appliedCount += 1
      }

      const currentCategory = (getValues('category') ?? '').trim()
      if (lookup.category && (shouldOverwrite || currentCategory.length === 0)) {
        setValue('category', lookup.category, { shouldDirty: shouldOverwrite, shouldTouch: true })
        appliedCount += 1
      }

      return appliedCount
    },
    [getValues, setValue],
  )

  const runBarcodeLookup = useCallback(
    async (barcode: string, mode: 'empty-only' | 'overwrite') => {
      if (!barcodeLengths.has(barcode.length)) {
        return
      }

      if (products.some((product) => product.barcode === barcode)) {
        return
      }

      try {
        const result = await lookupMutation.mutateAsync(barcode)
        const appliedCount = applyLookupValues(result, mode)
        setLookupContext(result)
        setLookupFeedback({
          tone: 'success',
          message:
            appliedCount > 0
              ? `Dados do EAN aplicados via ${result.source === 'open_food_facts' ? 'Open Food Facts' : 'catalogo externo'}.`
              : 'EAN encontrado, mas os campos atuais foram mantidos.',
        })
      } catch (error) {
        setLookupContext(null)
        if (error instanceof ApiError && error.status === 404) {
          setLookupFeedback({
            tone: 'warning',
            message: 'EAN nao encontrado na base externa. Continue com o cadastro manual.',
          })
          return
        }

        setLookupFeedback({
          tone: 'danger',
          message: error instanceof Error ? error.message : 'Nao foi possivel consultar o catalogo por EAN agora.',
        })
      }
    },
    [applyLookupValues, lookupMutation, products],
  )

  const activeLookupContext = useMemo(
    () => (lookupContext?.barcode === normalizedBarcode ? lookupContext : null),
    [lookupContext, normalizedBarcode],
  )

  return (
    <div className="min-h-screen min-h-[100svh] bg-[var(--bg)] text-[var(--text-primary)]">
      <header
        className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)]/95 px-3 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          aria-label="Voltar para o app do proprietário"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent,#008cff)]">
            {companyName}
          </p>
          <h1 className="truncate text-base font-semibold text-[var(--text-primary)]">Cadastro rápido</h1>
        </div>
      </header>

      <main className="space-y-4 p-3 pb-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
        {!isOnline ? (
          <div className="rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
            Sem conexão. Novos cadastros entram na fila local e sincronizam quando a rede voltar.
          </div>
        ) : null}

        <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Catálogo móvel</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Cadastro direto do balcão</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
            {displayName.split(' ')[0]}, use o EAN para evitar digitação e colocar o produto no banco em segundos.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Produtos', value: String(totals?.totalProducts ?? products.length), color: '#60a5fa' },
              { label: 'Categorias', value: String(categoriesCount), color: '#36f57c' },
              { label: queuedCount > 0 ? 'Fila' : 'Alerta', value: String(queuedCount > 0 ? queuedCount : lowStockCount), color: queuedCount > 0 ? '#fbbf24' : lowStockCount > 0 ? '#f59e0b' : '#8b98a7' },
            ].map(({ label, value, color }) => (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3" key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
                <p className="mt-1 text-xl font-bold" style={{ color }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {productsError ? (
          <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
            {productsError}
          </div>
        ) : null}

        <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">Leitura EAN</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Scanner, leitor ou digitação</h2>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                normalizedBarcode.length === 0
                  ? 'border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)]'
                  : barcodeValid
                    ? 'border border-[rgba(54,245,124,0.2)] bg-[rgba(54,245,124,0.1)] text-[#36f57c]'
                    : 'border border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.1)] text-[#fbbf24]'
              }`}
            >
              <ScanLine className="size-3" />
              {normalizedBarcode.length === 0 ? 'aguardando' : barcodeValid ? 'válido' : 'incompleto'}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[rgba(0,140,255,0.24)] bg-[rgba(0,140,255,0.08)] px-4 text-sm font-semibold text-[var(--accent,#008cff)]"
              type="button"
              onClick={() => setScannerOpen(true)}
            >
              <Camera className="size-4" />
              Escanear câmera
            </button>
            <span className="text-[11px] leading-5 text-[var(--text-soft)]">
              Android/Chrome primeiro. Safari continua no EAN manual ou leitor HID.
            </span>
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">Código de barras</span>
            <input
              className="flex h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-base text-[var(--text-primary)] transition placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              inputMode="numeric"
              placeholder="Aponte o leitor ou digite o EAN"
              type="text"
              value={barcodeInput}
              onChange={(event) => setBarcodeInput(event.currentTarget.value)}
            />
          </label>

          <div className="mt-3 flex items-center gap-2">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canLookup}
              type="button"
              onClick={() => void runBarcodeLookup(normalizedBarcode, 'overwrite')}
            >
              {lookupMutation.isPending ? <RefreshCcw className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
              {lookupMutation.isPending ? 'Consultando EAN...' : 'Buscar dados do EAN'}
            </button>
            <span className="text-[11px] leading-5 text-[var(--text-soft)]">Pré-preenche nome, marca e categoria.</span>
          </div>

          <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
            {duplicatedProduct ? (
              <div className="space-y-1">
                <p className="font-semibold text-[#fbbf24]">EAN já cadastrado no catálogo</p>
                <p className="text-[var(--text-primary)]">{duplicatedProduct.name}</p>
                <p className="text-xs text-[var(--text-soft)]">
                  {duplicatedProduct.category} · {duplicatedProduct.brand ?? 'sem marca'} · {duplicatedProduct.stockBaseUnits} und base
                </p>
              </div>
            ) : normalizedBarcode.length === 0 ? (
              <p className="text-xs text-[var(--text-soft)]">Use aqui o leitor HID, scanner ou digitação manual do EAN.</p>
            ) : barcodeValid ? (
              <div className="flex items-center gap-2 text-sm text-[#36f57c]">
                <CheckCircle2 className="size-4" />
                EAN pronto para ser salvo junto do produto.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-[#fbbf24]">
                <TriangleAlert className="size-4" />
                O código precisa ter 8, 12, 13 ou 14 dígitos.
              </div>
            )}
          </div>

          {lookupFeedback ? (
            <div
              className={`mt-3 rounded-2xl border px-4 py-3 text-xs ${
                lookupFeedback.tone === 'success'
                  ? 'border-[rgba(54,245,124,0.18)] bg-[rgba(54,245,124,0.08)] text-[#86efac]'
                  : lookupFeedback.tone === 'warning'
                    ? 'border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] text-[#fcd34d]'
                    : lookupFeedback.tone === 'danger'
                      ? 'border-[rgba(248,113,113,0.18)] bg-[rgba(248,113,113,0.08)] text-[#fca5a5]'
                      : 'border-[rgba(0,140,255,0.18)] bg-[rgba(0,140,255,0.08)] text-[var(--accent,#008cff)]'
              }`}
            >
              {lookupFeedback.message}
            </div>
          ) : null}

          {activeLookupContext ? (
            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent,#008cff)]">
                    Sugestão do EAN
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                    {activeLookupContext.packagingClass ?? 'Sem embalagem sugerida'}
                  </p>
                </div>
                <span className="rounded-full border border-[rgba(0,140,255,0.18)] bg-[rgba(0,140,255,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent,#008cff)]">
                  fonte externa
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {activeLookupContext.quantityLabel ? (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]">
                    Medida {activeLookupContext.quantityLabel}
                  </span>
                ) : null}
                {activeLookupContext.servingSize ? (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]">
                    Porção {activeLookupContext.servingSize}
                  </span>
                ) : null}
                {activeLookupContext.imageUrl ? (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]">
                    Foto disponível
                  </span>
                ) : null}
              </div>

              {activeLookupContext.description ? (
                <p className="mt-3 text-xs leading-5 text-[var(--text-soft)]">{activeLookupContext.description}</p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">Cadastro manual</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Dados mínimos do produto</h2>
            </div>
            <span className="rounded-full border border-[rgba(0,140,255,0.2)] bg-[rgba(0,140,255,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent,#008cff)]">
              móvel
            </span>
          </div>

          <form
            className="mt-4 space-y-4"
            onSubmit={handleSubmit(async (values) => {
              if (!canSubmit) {
                return
              }

              const payload: OwnerQueuedProductPayload = {
                ...values,
                ...resolveLookupProductFields(normalizedBarcode, activeLookupContext),
                barcode: barcodeValid ? normalizedBarcode : undefined,
              }

              try {
                await createProductMutation.mutateAsync(payload)
                toast.success('Produto cadastrado no catálogo')
                reset(defaultValues)
                setBarcodeInput('')
                setLookupFeedback(null)
                setLookupContext(null)
                await refreshQueuedCount()
              } catch (error) {
                if (isOfflineProductCreateError(error)) {
                  await enqueue({
                    type: 'owner.create-product',
                    payload,
                  })
                  createProductMutation.reset()
                  toast.info('Sem conexão — produto salvo localmente e será enviado ao reconectar.')
                  reset(defaultValues)
                  setBarcodeInput('')
                  setLookupFeedback({
                    tone: 'info',
                    message: 'Produto salvo na fila offline deste aparelho.',
                  })
                  setLookupContext(null)
                  await refreshQueuedCount()
                }
              }
            })}
          >
            <OwnerField error={errors.name?.message} label="Nome" placeholder="Ex.: Guaraná Lata" {...register('name')} />
            <div className="grid grid-cols-2 gap-3">
              <OwnerField error={errors.brand?.message} label="Marca" placeholder="Ex.: Antárctica" {...register('brand')} />
              <OwnerField error={errors.category?.message} label="Categoria" placeholder="Ex.: Bebidas" {...register('category')} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <OwnerField
                error={errors.unitCost?.message}
                label="Custo"
                min="0"
                step="0.01"
                type="number"
                {...register('unitCost')}
              />
              <OwnerField
                error={errors.unitPrice?.message}
                label="Venda"
                min="0"
                step="0.01"
                type="number"
                {...register('unitPrice')}
              />
              <OwnerField
                error={errors.stockBaseUnits?.message}
                label="Estoque"
                min="0"
                step="1"
                type="number"
                {...register('stockBaseUnits')}
              />
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Leitura rápida</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(Number(stockBaseUnits ?? 0) * Number(watch('unitPrice') ?? 0))}</p>
                </div>
                <div className="text-right text-xs text-[var(--text-soft)]">
                  <p>{Number(stockBaseUnits ?? 0)} und base</p>
                  <p>classe padrão: cadastro rápido móvel</p>
                </div>
              </div>
            </div>

            {createError ? (
              <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
                {createError}
              </div>
            ) : null}

            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(0,140,255,0.24)] bg-[var(--accent,#008cff)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit}
              type="submit"
            >
              <PackagePlus className="size-4" />
              {createProductMutation.isPending ? 'Cadastrando...' : 'Cadastrar produto'}
            </button>

            {queuedCount > 0 ? (
              <button
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-primary)]"
                type="button"
                onClick={() => void runDrain()}
              >
                <CloudOff className="size-4" />
                Sincronizar fila offline ({queuedCount})
              </button>
            ) : null}
          </form>
        </section>

        <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">Últimos itens</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Catálogo recente</h2>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              {recentProducts.length} itens
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {recentProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-5 text-center text-xs text-[var(--text-soft)]">
                Nenhum produto retornado ainda pela API.
              </div>
            ) : (
              recentProducts.map((product) => (
                <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3" key={product.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                        {product.category} · {product.brand ?? 'sem marca'}
                        {product.barcode ? ` · EAN ${product.barcode}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(product.unitPrice)}</p>
                      <p className="mt-1 text-[10px] text-[var(--text-soft)]">{product.stockBaseUnits} und</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <OwnerBarcodeScannerSheet
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setBarcodeInput(code)
          setScannerOpen(false)
          toast.success('EAN capturado pela câmera')
          void runBarcodeLookup(code, 'empty-only')
        }}
      />
    </div>
  )
}

type OwnerFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

function OwnerField({ error, label, className, ...props }: Readonly<OwnerFieldProps>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
      <input
        className={`flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] transition placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${className ?? ''}`}
        {...props}
      />
      {error ? <p className="text-xs text-[#fca5a5]">{error}</p> : null}
    </label>
  )
}

function isOfflineProductCreateError(error: unknown) {
  return error instanceof ApiError && (error.status === 0 || error.status === 504)
}

function resolveLookupProductFields(
  barcode: string,
  lookupContext: BarcodeCatalogLookupResponse | null,
) {
  if (!lookupContext || lookupContext.barcode !== barcode) {
    return {}
  }

  return {
    packagingClass: lookupContext.packagingClass ?? 'Cadastro rápido móvel',
    measurementUnit: lookupContext.measurementUnit ?? 'UN',
    measurementValue: lookupContext.measurementValue ?? 1,
    unitsPerPackage: 1,
    description: lookupContext.description ?? '',
  }
}
