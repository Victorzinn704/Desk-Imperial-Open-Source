'use client'

import { LoaderCircle, Printer } from 'lucide-react'

export function SaveButtons({
  isEditing,
  isBusy,
  hasItems,
  connectionState,
  onSave,
  onSaveAndPrint,
}: Readonly<{
  isEditing: boolean
  isBusy: boolean
  hasItems: boolean
  connectionState: string
  onSave: () => void
  onSaveAndPrint: () => void
}>) {
  const isPrinting = connectionState === 'printing'

  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <button
        className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface)] py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!hasItems || isPrinting || isBusy}
        type="button"
        onClick={onSave}
      >
        {isEditing ? 'Salvar alteracoes' : 'Abrir comanda'}
      </button>
      <button
        className="flex w-full items-center justify-center gap-2 rounded-[14px] border py-3 text-sm font-semibold text-[var(--success)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!hasItems || connectionState === 'discovering' || isPrinting || isBusy}
        style={{
          borderColor: 'color-mix(in srgb, var(--success) 28%, var(--border))',
          backgroundColor: 'color-mix(in srgb, var(--success) 10%, var(--surface))',
        }}
        type="button"
        onClick={onSaveAndPrint}
      >
        {isPrinting || isBusy ? <LoaderCircle className="animate-spin size-4" /> : <Printer className="size-4" />}
        {isEditing ? 'Salvar e imprimir' : 'Abrir e imprimir'}
      </button>
    </div>
  )
}
