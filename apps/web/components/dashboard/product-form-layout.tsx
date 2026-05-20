import type { ProductRecord } from '@contracts/contracts'
import { Button } from '@/components/shared/button'

export function ProductFormHeader({
  isEmbedded,
  onCancelEdit,
  product,
}: Readonly<{
  isEmbedded: boolean
  onCancelEdit: () => void
  product: ProductRecord | null
}>) {
  if (isEmbedded) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          {product ? 'Editar produto' : 'Novo produto'}
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
          {product ? 'Atualize os dados do portfólio.' : 'Cadastre um item para o dashboard.'}
        </h2>
      </div>
      {product ? (
        <Button size="sm" type="button" variant="ghost" onClick={onCancelEdit}>
          Cancelar
        </Button>
      ) : null}
    </div>
  )
}

export function ProductFormActions({
  isEmbedded,
  loading,
  onCancelEdit,
  product,
}: Readonly<{
  isEmbedded: boolean
  loading?: boolean
  onCancelEdit: () => void
  product: ProductRecord | null
}>) {
  if (isEmbedded) {
    return (
      <div className="flex flex-col-reverse gap-3 border-t border-dashed border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancelEdit}>
          Cancelar
        </Button>
        <Button loading={loading} size="lg" type="submit">
          {product ? 'Salvar alterações' : 'Cadastrar produto'}
        </Button>
      </div>
    )
  }

  return (
    <Button fullWidth loading={loading} size="lg" type="submit">
      {product ? 'Salvar alterações' : 'Cadastrar produto'}
    </Button>
  )
}
