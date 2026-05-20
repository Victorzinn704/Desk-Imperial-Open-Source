import type { ProductRecord } from '@contracts/contracts'
import type { BarcodeCatalogLookupResponse } from '@/lib/api'
import { Camera, CheckCircle2, RefreshCcw, ScanLine, TriangleAlert } from 'lucide-react'
import type { LookupFeedback } from './owner-quick-register-model'

export function OwnerQuickRegisterBarcodeSection({
  activeLookupContext,
  barcodeInput,
  barcodeValid,
  canLookup,
  duplicatedProduct,
  lookupFeedback,
  lookupPending,
  normalizedBarcode,
  onLookup,
  onOpenScanner,
  onSetBarcode,
}: Readonly<{
  activeLookupContext: BarcodeCatalogLookupResponse | null
  barcodeInput: string
  barcodeValid: boolean
  canLookup: boolean
  duplicatedProduct: ProductRecord | null
  lookupFeedback: LookupFeedback | null
  lookupPending: boolean
  normalizedBarcode: string
  onLookup: () => void
  onOpenScanner: () => void
  onSetBarcode: (value: string) => void
}>) {
  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <BarcodeSectionHeader barcodeValid={barcodeValid} normalizedBarcode={normalizedBarcode} />
      <ScannerCallout onOpenScanner={onOpenScanner} />
      <BarcodeInput barcodeInput={barcodeInput} onSetBarcode={onSetBarcode} />
      <BarcodeLookupAction canLookup={canLookup} lookupPending={lookupPending} onLookup={onLookup} />
      <BarcodeStatusPanel
        barcodeValid={barcodeValid}
        duplicatedProduct={duplicatedProduct}
        normalizedBarcode={normalizedBarcode}
      />
      {lookupFeedback ? <LookupFeedbackPanel feedback={lookupFeedback} /> : null}
      {activeLookupContext ? <LookupContextPanel context={activeLookupContext} /> : null}
    </section>
  )
}

function BarcodeSectionHeader({
  barcodeValid,
  normalizedBarcode,
}: Readonly<{ barcodeValid: boolean; normalizedBarcode: string }>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
          Leitura EAN
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Scanner, leitor ou digitação</h2>
      </div>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${getBarcodePillClass(normalizedBarcode, barcodeValid)}`}
      >
        <ScanLine className="size-3" />
        {getBarcodePillLabel(normalizedBarcode, barcodeValid)}
      </span>
    </div>
  )
}

function ScannerCallout({ onOpenScanner }: Readonly<{ onOpenScanner: () => void }>) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[rgba(0,140,255,0.24)] bg-[rgba(0,140,255,0.08)] px-4 text-sm font-semibold text-[var(--accent,#008cff)]"
        type="button"
        onClick={onOpenScanner}
      >
        <Camera className="size-4" />
        Escanear câmera
      </button>
      <span className="text-[11px] leading-5 text-[var(--text-soft)]">
        Usa leitor nativo quando existe e fallback por câmera quando o navegador permitir.
      </span>
    </div>
  )
}

function BarcodeInput({
  barcodeInput,
  onSetBarcode,
}: Readonly<{ barcodeInput: string; onSetBarcode: (value: string) => void }>) {
  return (
    <label className="mt-4 block space-y-2">
      <span className="text-sm font-medium text-[var(--text-muted)]">Código de barras</span>
      <input
        className="flex h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-base text-[var(--text-primary)] transition placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        inputMode="numeric"
        placeholder="Aponte o leitor ou digite o EAN"
        type="text"
        value={barcodeInput}
        onChange={(event) => onSetBarcode(event.currentTarget.value)}
      />
    </label>
  )
}

function BarcodeLookupAction({
  canLookup,
  lookupPending,
  onLookup,
}: Readonly<{ canLookup: boolean; lookupPending: boolean; onLookup: () => void }>) {
  const label = lookupPending ? 'Consultando EAN...' : 'Buscar dados do EAN'
  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canLookup}
        type="button"
        onClick={onLookup}
      >
        {lookupPending ? <RefreshCcw className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
        {label}
      </button>
      <span className="text-[11px] leading-5 text-[var(--text-soft)]">Pré-preenche nome, marca e categoria.</span>
    </div>
  )
}

function BarcodeStatusPanel({
  barcodeValid,
  duplicatedProduct,
  normalizedBarcode,
}: Readonly<{
  barcodeValid: boolean
  duplicatedProduct: ProductRecord | null
  normalizedBarcode: string
}>) {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
      {renderBarcodeStatusContent(normalizedBarcode, barcodeValid, duplicatedProduct)}
    </div>
  )
}

function renderBarcodeStatusContent(
  normalizedBarcode: string,
  barcodeValid: boolean,
  duplicatedProduct: ProductRecord | null,
) {
  if (duplicatedProduct) {
    return <DuplicatedProductStatus product={duplicatedProduct} />
  }
  if (normalizedBarcode.length === 0) {
    return <p className="text-xs text-[var(--text-soft)]">Use aqui o leitor HID, scanner ou digitação manual do EAN.</p>
  }
  return barcodeValid ? <ValidBarcodeStatus /> : <InvalidBarcodeStatus />
}

function DuplicatedProductStatus({ product }: Readonly<{ product: ProductRecord }>) {
  return (
    <div className="space-y-1">
      <p className="font-semibold text-[#fbbf24]">EAN já cadastrado no catálogo</p>
      <p className="text-[var(--text-primary)]">{product.name}</p>
      <p className="text-xs text-[var(--text-soft)]">
        {product.category} · {product.brand ?? 'sem marca'} · {product.stockBaseUnits} und base
      </p>
    </div>
  )
}

function ValidBarcodeStatus() {
  return (
    <div className="flex items-center gap-2 text-sm text-[#36f57c]">
      <CheckCircle2 className="size-4" />
      EAN pronto para ser salvo junto do produto.
    </div>
  )
}

function InvalidBarcodeStatus() {
  return (
    <div className="flex items-center gap-2 text-sm text-[#fbbf24]">
      <TriangleAlert className="size-4" />O código precisa ter 8, 12, 13 ou 14 dígitos.
    </div>
  )
}

function LookupFeedbackPanel({ feedback }: Readonly<{ feedback: LookupFeedback }>) {
  return (
    <div className={`mt-3 rounded-2xl border px-4 py-3 text-xs ${getFeedbackClass(feedback.tone)}`}>
      {feedback.message}
    </div>
  )
}

function LookupContextPanel({ context }: Readonly<{ context: BarcodeCatalogLookupResponse }>) {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent,#008cff)]">
            Sugestão do EAN
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {context.packagingClass ?? 'Sem embalagem sugerida'}
          </p>
        </div>
        <span className="rounded-full border border-[rgba(0,140,255,0.18)] bg-[rgba(0,140,255,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent,#008cff)]">
          fonte externa
        </span>
      </div>
      <LookupContextTags context={context} />
      {context.description ? (
        <p className="mt-3 text-xs leading-5 text-[var(--text-soft)]">{context.description}</p>
      ) : null}
    </div>
  )
}

function LookupContextTags({ context }: Readonly<{ context: BarcodeCatalogLookupResponse }>) {
  const tags = [
    context.quantityLabel ? `Medida ${context.quantityLabel}` : null,
    context.servingSize ? `Porção ${context.servingSize}` : null,
    context.imageUrl ? 'Foto disponível' : null,
  ].filter((value): value is string => Boolean(value))
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]"
          key={tag}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

function getBarcodePillClass(normalizedBarcode: string, barcodeValid: boolean) {
  if (normalizedBarcode.length === 0) {
    return 'border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)]'
  }
  if (barcodeValid) {
    return 'border border-[rgba(54,245,124,0.2)] bg-[rgba(54,245,124,0.1)] text-[#36f57c]'
  }
  return 'border border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.1)] text-[#fbbf24]'
}

function getBarcodePillLabel(normalizedBarcode: string, barcodeValid: boolean) {
  if (normalizedBarcode.length === 0) {
    return 'aguardando'
  }
  return barcodeValid ? 'válido' : 'incompleto'
}

function getFeedbackClass(tone: LookupFeedback['tone']) {
  if (tone === 'success') {
    return 'border-[rgba(54,245,124,0.18)] bg-[rgba(54,245,124,0.08)] text-[#86efac]'
  }
  if (tone === 'warning') {
    return 'border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] text-[#fcd34d]'
  }
  if (tone === 'danger') {
    return 'border-[rgba(248,113,113,0.18)] bg-[rgba(248,113,113,0.08)] text-[#fca5a5]'
  }
  return 'border-[rgba(0,140,255,0.18)] bg-[rgba(0,140,255,0.08)] text-[var(--accent,#008cff)]'
}
