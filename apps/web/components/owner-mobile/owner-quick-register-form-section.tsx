import type { FormEventHandler } from 'react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { CloudOff, PackagePlus, Sparkles } from 'lucide-react'
import { formatBRL as formatCurrency } from '@/lib/currency'
import { OwnerField } from './owner-quick-register-field'
import type { OwnerQuickRegisterInput } from './owner-quick-register-model'

export function OwnerQuickRegisterFormSection({
  canSubmit,
  createError,
  errors,
  isPending,
  measurementUnit,
  measurementValue,
  packagingClass,
  onDrain,
  onImproveWithAi,
  onSubmit,
  queuedCount,
  register,
  requiresKitchen,
  smartDraftError,
  smartDraftPending,
  stockBaseUnits,
  stockValue,
}: Readonly<{
  canSubmit: boolean
  createError: string | null
  errors: FieldErrors<OwnerQuickRegisterInput>
  isPending: boolean
  measurementUnit: string
  measurementValue: number
  packagingClass: string
  onDrain: () => void
  onImproveWithAi: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  queuedCount: number
  register: UseFormRegister<OwnerQuickRegisterInput>
  requiresKitchen: boolean
  smartDraftError: string | null
  smartDraftPending: boolean
  stockBaseUnits: number
  stockValue: number
}>) {
  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <FormHeader onImproveWithAi={onImproveWithAi} smartDraftPending={smartDraftPending} />
      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <ProductIdentityFields errors={errors} register={register} />
        <ProductCommercialFields errors={errors} register={register} />
        <KitchenToggle register={register} />
        <SmartDraftReadout
          measurementUnit={measurementUnit}
          measurementValue={measurementValue}
          packagingClass={packagingClass}
          requiresKitchen={requiresKitchen}
          smartDraftError={smartDraftError}
          stockBaseUnits={stockBaseUnits}
          stockValue={stockValue}
        />
        {createError ? <CreateErrorPanel message={createError} /> : null}
        <SubmitAction canSubmit={canSubmit} isPending={isPending} />
        {queuedCount > 0 ? <OfflineQueueAction queuedCount={queuedCount} onDrain={onDrain} /> : null}
      </form>
    </section>
  )
}

function FormHeader({
  onImproveWithAi,
  smartDraftPending,
}: Readonly<{
  onImproveWithAi: () => void
  smartDraftPending: boolean
}>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
          Cadastro manual
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Dados mínimos do produto</h2>
        <p className="mt-1 text-xs text-[var(--text-soft)]">
          A IA organiza nome, embalagem, medida e fluxo operacional sem mexer em custo ou venda.
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="rounded-full border border-[rgba(0,140,255,0.2)] bg-[rgba(0,140,255,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent,#008cff)]">
          móvel
        </span>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[rgba(0,140,255,0.18)] bg-[rgba(0,140,255,0.08)] px-3 text-xs font-semibold text-[var(--accent,#008cff)] disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={onImproveWithAi}
          disabled={smartDraftPending}
        >
          <Sparkles className="size-4" />
          {smartDraftPending ? 'Analisando...' : 'Refinar com IA'}
        </button>
      </div>
    </div>
  )
}

function ProductIdentityFields({
  errors,
  register,
}: Readonly<{
  errors: FieldErrors<OwnerQuickRegisterInput>
  register: UseFormRegister<OwnerQuickRegisterInput>
}>) {
  return (
    <>
      <OwnerField error={errors.name?.message} label="Nome" placeholder="Ex.: Guaraná Lata" {...register('name')} />
      <div className="grid grid-cols-2 gap-3">
        <OwnerField error={errors.brand?.message} label="Marca" placeholder="Ex.: Antárctica" {...register('brand')} />
        <OwnerField
          error={errors.category?.message}
          label="Categoria"
          placeholder="Ex.: Bebidas"
          {...register('category')}
        />
      </div>
    </>
  )
}

function ProductCommercialFields({
  errors,
  register,
}: Readonly<{
  errors: FieldErrors<OwnerQuickRegisterInput>
  register: UseFormRegister<OwnerQuickRegisterInput>
}>) {
  return (
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
  )
}

function KitchenToggle({ register }: Readonly<{ register: UseFormRegister<OwnerQuickRegisterInput> }>) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Envia direto para preparo</p>
        <p className="mt-1 text-xs text-[var(--text-soft)]">
          Ative para itens que passam por cozinha, chapa, montagem ou produção interna.
        </p>
      </div>
      <input className="size-4 accent-[var(--accent,#008cff)]" type="checkbox" {...register('requiresKitchen')} />
    </label>
  )
}

function SmartDraftReadout({
  measurementUnit,
  measurementValue,
  packagingClass,
  requiresKitchen,
  smartDraftError,
  stockBaseUnits,
  stockValue,
}: Readonly<{
  measurementUnit: string
  measurementValue: number
  packagingClass: string
  requiresKitchen: boolean
  smartDraftError: string | null
  stockBaseUnits: number
  stockValue: number
}>) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            Leitura operacional
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(stockValue)}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--text-soft)]">
            <span className="rounded-full border border-[var(--border)] px-2.5 py-1">{packagingClass}</span>
            <span className="rounded-full border border-[var(--border)] px-2.5 py-1">
              {measurementValue} {measurementUnit}
            </span>
            <span className="rounded-full border border-[var(--border)] px-2.5 py-1">
              {requiresKitchen ? 'vai para preparo' : 'prateleira imediata'}
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-[var(--text-soft)]">
          <p>{stockBaseUnits} und base</p>
          <p>estoque inicial previsto</p>
        </div>
      </div>
      {smartDraftError ? (
        <p className="mt-3 text-xs text-[#fca5a5]">{smartDraftError}</p>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-soft)]">
          O motor inteligente trata o cadastro como operação de varejo e mercado, sem inventar preço ou saldo.
        </p>
      )}
    </div>
  )
}

function CreateErrorPanel({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
      {message}
    </div>
  )
}

function SubmitAction({ canSubmit, isPending }: Readonly<{ canSubmit: boolean; isPending: boolean }>) {
  return (
    <button
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(0,140,255,0.24)] bg-[var(--accent,#008cff)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!canSubmit}
      type="submit"
    >
      <PackagePlus className="size-4" />
      {isPending ? 'Cadastrando...' : 'Cadastrar produto'}
    </button>
  )
}

function OfflineQueueAction({ onDrain, queuedCount }: Readonly<{ onDrain: () => void; queuedCount: number }>) {
  return (
    <button
      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-primary)]"
      type="button"
      onClick={onDrain}
    >
      <CloudOff className="size-4" />
      Sincronizar fila offline ({queuedCount})
    </button>
  )
}
