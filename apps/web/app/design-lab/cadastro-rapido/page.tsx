'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ProductRecord } from '@contracts/contracts'
import { Camera, Database, Keyboard, ScanBarcode, Smartphone } from 'lucide-react'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import {
  LabFactPill,
  LabMetricStrip,
  LabMetricStripItem,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
  LabTable,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'

const barcodeLengths = new Set([8, 12, 13, 14])

export default function DesignLabCadastroRapidoPage() {
  const { sessionQuery, productsQuery } = useDashboardQueries({ section: 'portfolio' })
  const user = sessionQuery.data?.user
  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data?.items])
  const totals = productsQuery.data?.totals
  const categoriesCount = totals?.categories.length ?? new Set(products.map((product) => product.category)).size
  const lowStockCount = products.filter((product) => product.isLowStock).length

  return (
    <section className="space-y-6">
      <LabPageHeader
        description="Entrada de produtos por banco, EAN, câmera PWA e leitura local."
        eyebrow="Entrada de catálogo"
        title="Cadastro rápido"
      >
        <LabMetricStrip>
          <LabMetricStripItem
            description="itens retornados pela API"
            label="produtos no banco"
            value={String(totals?.totalProducts ?? products.length)}
          />
          <LabMetricStripItem
            description="famílias já existentes"
            label="categorias"
            value={String(categoriesCount)}
          />
          <LabMetricStripItem
            description="itens pedindo reposição"
            label="estoque baixo"
            value={String(lowStockCount)}
          />
          <LabMetricStripItem
            description="leitura local planejada"
            label="bipador"
            value="local"
          />
        </LabMetricStrip>
      </LabPageHeader>

      {sessionQuery.isLoading ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-fg-soft)]">Carregando sessão para abrir o cadastro rápido.</p>
        </LabPanel>
      ) : null}

      {!sessionQuery.isLoading && !user ? <QuickRegisterLockedState /> : null}

      {user ? (
        <QuickRegisterWorkspace
          isLoading={productsQuery.isLoading || productsQuery.isFetching}
          products={products}
          productsError={productsQuery.error instanceof Error ? productsQuery.error.message : null}
        />
      ) : null}
    </section>
  )
}

function QuickRegisterLockedState() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <LabPanel
        action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
        padding="md"
        title="Prévia travada do cadastro rápido"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <LabFactPill label="fonte" value="API · câmera · local" />
            <LabFactPill label="destino" value="portfólio" />
            <LabFactPill label="ean" value="8 · 12 · 13 · 14" />
            <LabFactPill label="modo" value="rápido" />
          </div>

          <div className="space-y-0">
            <LabSignalRow
              label="produtos do banco"
              note="ao entrar, a seção lê os produtos reais já cadastrados pela API"
              tone="success"
              value="bloqueado"
            />
            <LabSignalRow
              label="câmera PWA"
              note="o celular poderá ler código de barras e enviar o EAN para cadastro"
              tone="info"
              value="planejado"
            />
            <LabSignalRow
              label="celular bipador"
              note="o pareamento recomendado é local por QR/token; Bluetooth exige app nativo ou hardware HID"
              tone="warning"
              value="local"
            />
            <LabSignalRow
              label="enriquecimento"
              note="EAN poderá buscar nome, marca e categoria em fonte externa antes de salvar"
              tone="neutral"
              value="próximo"
            />
          </div>

          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
            href="/login"
          >
            Entrar para liberar cadastro
          </Link>
        </div>
      </LabPanel>

      <ScannerLocalPlanPanel />
    </div>
  )
}

function QuickRegisterWorkspace({
  isLoading,
  products,
  productsError,
}: Readonly<{
  isLoading: boolean
  products: ProductRecord[]
  productsError: string | null
}>) {
  const [manualCode, setManualCode] = useState('')
  const normalizedCode = manualCode.replace(/\D/g, '')
  const codeTone: LabStatusTone = normalizedCode.length === 0 ? 'neutral' : barcodeLengths.has(normalizedCode.length) ? 'success' : 'warning'
  const codeValue =
    normalizedCode.length === 0
      ? 'aguardando'
      : barcodeLengths.has(normalizedCode.length)
        ? `${normalizedCode.length} dígitos`
        : 'incompleto'
  const recentProducts = [...products]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8)

  return (
    <div className="space-y-5">
      {productsError ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-danger)]">{productsError}</p>
        </LabPanel>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <LabPanel
          action={<LabStatusPill tone={isLoading ? 'warning' : 'success'}>{isLoading ? 'lendo' : 'conectado'}</LabStatusPill>}
          padding="md"
          title="Entrada rápida"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-0">
              <QuickRegisterChannel
                icon={Database}
                label="Banco/API"
                note="produtos reais já cadastrados continuam entrando pelo contrato atual"
                tone="success"
                value={`${products.length} itens`}
              />
              <QuickRegisterChannel
                icon={Camera}
                label="Câmera PWA"
                note="leitura por câmera fica melhor para o celular que já está na mão"
                tone="info"
                value="próximo"
              />
              <QuickRegisterChannel
                icon={Smartphone}
                label="Celular bipador"
                note="pareamento local por QR/token evita depender de Bluetooth no navegador"
                tone="warning"
                value="local"
              />
              <QuickRegisterChannel
                icon={Keyboard}
                label="Leitor HID"
                note="hardware Bluetooth/USB que digita no campo focado funciona hoje como teclado"
                tone="neutral"
                value="compatível"
              />
            </div>

            <div className="rounded-2xl border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">
                    leitura local
                  </p>
                  <p className="mt-1 text-sm text-[var(--lab-fg)]">Campo pronto para scanner teclado/HID.</p>
                </div>
                <LabStatusPill tone={codeTone}>{codeValue}</LabStatusPill>
              </div>

              <label className="mt-4 block">
                <span className="sr-only">Código de barras</span>
                <input
                  className="h-12 w-full rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface)] px-3 font-mono text-sm text-[var(--lab-fg)] outline-none transition placeholder:text-[var(--lab-fg-muted)] focus:border-[var(--lab-blue-border)]"
                  inputMode="numeric"
                  placeholder="Aponte o leitor ou digite o EAN"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.currentTarget.value)}
                />
              </label>
              <p className="mt-3 text-xs leading-5 text-[var(--lab-fg-soft)]">
                Este campo ainda não salva no banco. Ele valida a captura local e prepara o fluxo para enriquecer pelo EAN.
              </p>
            </div>
          </div>
        </LabPanel>

        <ScannerLocalPlanPanel />
      </div>

      <RecentProductsPanel products={recentProducts} />
    </div>
  )
}

function ScannerLocalPlanPanel() {
  return (
    <LabPanel
      action={<LabStatusPill tone="info">arquitetura</LabStatusPill>}
      padding="md"
      title="Celular como bipador"
    >
      <div className="space-y-0">
        <LabSignalRow
          label="melhor caminho"
          note="PWA no celular lê câmera e envia o EAN por pareamento local"
          tone="success"
          value="QR/token"
        />
        <LabSignalRow
          label="bluetooth web"
          note="Web Bluetooth conecta em periféricos BLE, mas não transforma PWA em leitor Bluetooth"
          tone="warning"
          value="limitado"
        />
        <LabSignalRow
          label="android nativo"
          note="um app dedicado pode emular HID ou fazer ponte local com mais controle"
          tone="info"
          value="possível"
        />
        <LabSignalRow
          label="iphone"
          note="Safari/iOS não é uma base confiável para Web Bluetooth"
          tone="danger"
          value="evitar"
        />
      </div>
    </LabPanel>
  )
}

function QuickRegisterChannel({
  icon: Icon,
  label,
  note,
  tone,
  value,
}: Readonly<{
  icon: typeof ScanBarcode
  label: string
  note: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--lab-border)] py-4 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface)] text-[var(--lab-blue)]">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--lab-fg)]">{label}</p>
          <p className="mt-1 text-[13px] leading-5 text-[var(--lab-fg-soft)]">{note}</p>
        </div>
      </div>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

function RecentProductsPanel({ products }: Readonly<{ products: ProductRecord[] }>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{products.length} recentes</LabStatusPill>}
      padding="md"
      title="Produtos vindos da API"
    >
      <LabTable
        dense
        columns={[
          {
            id: 'produto',
            header: 'Produto',
            cell: (product) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--lab-fg)]">{product.name}</p>
                <p className="mt-1 truncate text-xs text-[var(--lab-fg-soft)]">
                  {product.category} · {product.brand ?? 'sem marca'}
                </p>
              </div>
            ),
          },
          {
            id: 'estoque',
            header: 'Estoque',
            cell: (product) => (
              <LabStatusPill tone={product.isLowStock ? 'warning' : 'success'}>
                {product.stockBaseUnits} und
              </LabStatusPill>
            ),
            width: '130px',
          },
          {
            id: 'preco',
            header: 'Preço',
            cell: (product) => (
              <span className="font-semibold text-[var(--lab-fg)]">
                {formatCurrency(product.unitPrice, product.displayCurrency)}
              </span>
            ),
            align: 'right',
            width: '140px',
          },
          {
            id: 'origem',
            header: 'Origem',
            cell: (product) => (
              <span className="text-xs text-[var(--lab-fg-soft)]">
                API · {formatProductDate(product.updatedAt)}
              </span>
            ),
            align: 'right',
            width: '180px',
          },
        ]}
        emptyDescription="Quando a API retornar produtos, os últimos itens do catálogo aparecem aqui."
        emptyTitle="Nenhum produto vindo da API"
        rowKey="id"
        rows={products}
      />
    </LabPanel>
  )
}

function formatProductDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'sem data'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
