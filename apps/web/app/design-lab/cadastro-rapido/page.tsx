'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ProductRecord } from '@contracts/contracts'
import { Camera, Database, Keyboard, type ScanBarcode, Smartphone } from 'lucide-react'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { QuickRegisterProductForm } from '@/components/design-lab/sections/quick-register-product-form'
import {
  LabFactPill,
  LabMetricStrip,
  LabMetricStripItem,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
  type LabStatusTone,
  LabTable,
} from '@/components/design-lab/lab-primitives'
import { ProductThumb } from '@/components/shared/product-thumb'
import { formatCurrency } from '@/lib/currency'

const barcodeLengths = new Set([8, 12, 13, 14])

export default function DesignLabCadastroRapidoPage() {
  const { sessionQuery, productsQuery } = useDashboardQueries({ section: 'portfolio' })
  const { createProductMutation } = useDashboardMutations()
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
          <LabMetricStripItem description="famílias já existentes" label="categorias" value={String(categoriesCount)} />
          <LabMetricStripItem
            description="itens pedindo reposição"
            label="estoque baixo"
            value={String(lowStockCount)}
          />
          <LabMetricStripItem description="leitura local planejada" label="bipador" value="local" />
        </LabMetricStrip>
      </LabPageHeader>

      {sessionQuery.isLoading ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-fg-soft)]">Carregando sessão para abrir o cadastro rápido.</p>
        </LabPanel>
      ) : null}

      {!(sessionQuery.isLoading || user) ? <QuickRegisterLockedState /> : null}

      {user ? (
        <QuickRegisterWorkspace
          createBusy={createProductMutation.isPending}
          createError={createProductMutation.error instanceof Error ? createProductMutation.error.message : null}
          isLoading={productsQuery.isLoading || productsQuery.isFetching}
          products={products}
          productsError={productsQuery.error instanceof Error ? productsQuery.error.message : null}
          onCreateProduct={async (payload) => {
            await createProductMutation.mutateAsync(payload)
          }}
        />
      ) : null}
    </section>
  )
}

function QuickRegisterLockedState() {
  return (
    <LabPanel
      action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
      padding="md"
      subtitle="Banco, câmera, leitura local e pareamento do celular entram quando a sessão estiver ativa."
      title="Prévia travada do cadastro rápido"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <QuickRegisterSectionLead
            description="A leitura rápida nasce de três entradas: catálogo real, captura por câmera e leitura local por HID."
            eyebrow="entrada prevista"
            title="Fontes que entram no fluxo"
          />
          <div className="flex flex-wrap gap-2">
            <LabFactPill label="fonte" value="API · câmera · local" />
            <LabFactPill label="destino" value="portfólio" />
            <LabFactPill label="ean" value="8 · 12 · 13 · 14" />
            <LabFactPill label="modo" value="rápido" />
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
            href="/login"
          >
            Entrar para liberar cadastro
          </Link>
        </div>

        <div className="space-y-0 xl:border-l xl:border-[var(--lab-border)] xl:pl-5">
          <QuickRegisterSectionLead
            description="A superfície passa a ler o banco real e já prepara o próximo passo para captura via EAN."
            eyebrow="fluxo esperado"
            title="O que destrava ao entrar"
          />
          <LabSignalRow
            label="produtos do banco"
            note="ao entrar, a seção lê os produtos reais já cadastrados pela API"
            tone="success"
            value="bloqueado"
          />
          <LabSignalRow
            label="câmera PWA"
            note="o owner PWA já abre a câmera quando o navegador suporta leitura nativa e envia o EAN para cadastro"
            tone="info"
            value="ativo"
          />
          <LabSignalRow
            label="enriquecimento"
            note="EAN poderá buscar nome, marca e categoria em fonte externa antes de salvar"
            tone="neutral"
            value="próximo"
          />
        </div>

        <QuickRegisterArchitectureRail className="xl:border-l xl:border-[var(--lab-border)] xl:pl-5" />
      </div>
    </LabPanel>
  )
}

function QuickRegisterWorkspace({
  createBusy,
  createError,
  isLoading,
  products,
  productsError,
  onCreateProduct,
}: Readonly<{
  createBusy: boolean
  createError: string | null
  isLoading: boolean
  products: ProductRecord[]
  productsError: string | null
  onCreateProduct: Parameters<typeof QuickRegisterProductForm>[0]['onSubmit']
}>) {
  const [manualCode, setManualCode] = useState('')
  const normalizedCode = manualCode.replace(/\D/g, '')
  const codeTone: LabStatusTone =
    normalizedCode.length === 0 ? 'neutral' : barcodeLengths.has(normalizedCode.length) ? 'success' : 'warning'
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

      <LabPanel
        action={
          <LabStatusPill tone={isLoading ? 'warning' : 'success'}>{isLoading ? 'lendo' : 'conectado'}</LabStatusPill>
        }
        padding="md"
        subtitle="Banco, câmera, leitura local e hardware HID entram na mesma leitura operacional."
        title="Entrada rápida"
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)_minmax(320px,0.95fr)]">
          <div className="space-y-0">
            <QuickRegisterSectionLead
              description="O catálogo real continua vindo da API. O restante entra como captura local ou mobile."
              eyebrow="canais ativos"
              title="Entrada operacional"
            />
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
              note="owner PWA já usa leitura nativa por câmera quando o navegador oferece BarcodeDetector"
              tone="info"
              value="ativo"
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

          <QuickRegisterCaptureRail
            codeTone={codeTone}
            codeValue={codeValue}
            manualCode={manualCode}
            normalizedCode={normalizedCode}
            onManualCodeChange={setManualCode}
          />

          <QuickRegisterProductForm
            busy={createBusy}
            capturedCode={normalizedCode}
            capturedCodeValid={barcodeLengths.has(normalizedCode.length)}
            errorMessage={createError}
            onSubmit={async (payload) => {
              await onCreateProduct(payload)
              setManualCode('')
            }}
          />
        </div>
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="info">contrato atual</LabStatusPill>}
        padding="md"
        subtitle="O fluxo já salva produto no catálogo real. O enriquecimento por EAN fica como próxima evolução do domínio."
        title="Leitura de arquitetura"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-0">
            <LabSignalRow
              label="persistência"
              note="o formulário da direita já cria o produto no backend atual de /products"
              tone="success"
              value="ativa"
            />
            <LabSignalRow
              label="captura local"
              note="scanner HID e leitura manual já entram no mesmo campo de captura"
              tone="info"
              value="ativa"
            />
            <LabSignalRow
              label="ean no produto"
              note="o domínio Product já persiste o código lido; o próximo corte fica só no enriquecimento automático"
              tone="success"
              value="ativo"
            />
          </div>
          <QuickRegisterArchitectureRail className="xl:border-l xl:border-[var(--lab-border)] xl:pl-5" />
        </div>
      </LabPanel>

      <RecentProductsSection products={recentProducts} />
    </div>
  )
}

function QuickRegisterCaptureRail({
  codeTone,
  codeValue,
  manualCode,
  normalizedCode,
  onManualCodeChange,
}: Readonly<{
  codeTone: LabStatusTone
  codeValue: string
  manualCode: string
  normalizedCode: string
  onManualCodeChange: (value: string) => void
}>) {
  const captureNote =
    normalizedCode.length === 0
      ? 'Aguardando leitura do scanner ou digitação manual.'
      : barcodeLengths.has(normalizedCode.length)
        ? 'Formato aceito. O EAN já pode seguir para o cadastro; o próximo passo fica no enriquecimento automático.'
        : 'Leitura ainda incompleta para um EAN válido.'

  return (
    <div className="space-y-5 xl:border-l xl:border-[var(--lab-border)] xl:px-5">
      <div className="flex items-start justify-between gap-3">
        <QuickRegisterSectionLead
          description="Campo para scanner teclado/HID e validação imediata do comprimento do código."
          eyebrow="leitura local"
          title="Scanner pronto"
        />
        <LabStatusPill tone={codeTone}>{codeValue}</LabStatusPill>
      </div>

      <div className="flex flex-wrap gap-2">
        <LabFactPill label="EAN aceitos" value="8 · 12 · 13 · 14" />
        <LabFactPill label="modo" value="teclado / HID" />
        <LabFactPill label="destino" value="cadastro" />
      </div>

      <label className="block">
        <span className="sr-only">Código de barras</span>
        <input
          className="h-12 w-full rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-3 font-mono text-sm text-[var(--lab-fg)] outline-none transition placeholder:text-[var(--lab-fg-muted)] focus:border-[var(--lab-blue-border)]"
          inputMode="numeric"
          placeholder="Aponte o leitor ou digite o EAN"
          value={manualCode}
          onChange={(event) => onManualCodeChange(event.currentTarget.value)}
        />
      </label>

      <div className="space-y-0 border-t border-dashed border-[var(--lab-border)] pt-1">
        <LabSignalRow label="captura" note={captureNote} tone={codeTone} value={codeValue} />
        <LabSignalRow
          label="persistência"
          note="esta leitura já pode ser enviada no cadastro do produto e persistida junto do item"
          tone="success"
          value="ativa"
        />
      </div>
    </div>
  )
}

function QuickRegisterArchitectureRail({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={className}>
      <QuickRegisterSectionLead
        description="Decisão prática para captura local sem depender de Bluetooth web como peça central."
        eyebrow="celular como bipador"
        title="Arquitetura local"
      />
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
    </div>
  )
}

function QuickRegisterSectionLead({
  eyebrow,
  title,
  description,
}: Readonly<{
  eyebrow: string
  title: string
  description: string
}>) {
  return (
    <div className="space-y-1 pb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">{eyebrow}</p>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--lab-fg)]">{title}</h3>
        <p className="text-sm leading-6 text-[var(--lab-fg-soft)]">{description}</p>
      </div>
    </div>
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

function RecentProductsSection({ products }: Readonly<{ products: ProductRecord[] }>) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--lab-border)] pb-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--lab-fg)]">Produtos vindos da API</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--lab-fg-soft)]">
            Últimos itens já persistidos no catálogo real, sem encapsular a tabela em outro card.
          </p>
        </div>
        <LabStatusPill tone="neutral">{products.length} recentes</LabStatusPill>
      </div>

      <LabTable
        dense
        columns={[
          {
            id: 'produto',
            header: 'Produto',
            cell: (product) => (
              <div className="flex min-w-0 items-center gap-3">
                <ProductThumb
                  product={{
                    name: product.name,
                    brand: product.brand,
                    barcode: product.barcode,
                    category: product.category,
                    packagingClass: product.packagingClass,
                    quantityLabel: product.quantityLabel,
                    imageUrl: product.imageUrl,
                    catalogSource: product.catalogSource,
                    isCombo: product.isCombo,
                  }}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--lab-fg)]">{product.name}</p>
                  <p className="mt-1 truncate text-xs text-[var(--lab-fg-soft)]">
                    {product.category} · {product.brand ?? 'sem marca'}
                    {product.barcode ? ` · EAN ${product.barcode}` : ''}
                  </p>
                </div>
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
              <span className="text-xs text-[var(--lab-fg-soft)]">API · {formatProductDate(product.updatedAt)}</span>
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
    </section>
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
