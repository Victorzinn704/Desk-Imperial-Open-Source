'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ProductRecord } from '@contracts/contracts'
import { currencyOptions } from '@/lib/currency'
import { productSchema, type ProductFormInputValues, type ProductFormValues } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'

const emptyValues: ProductFormInputValues = {
  name: '',
  category: '',
  description: '',
  unitCost: 0,
  unitPrice: 0,
  currency: 'BRL',
  stock: 0,
}

export function ProductForm({
  product,
  onSubmit,
  onCancelEdit,
  loading,
}: Readonly<{
  product: ProductRecord | null
  onSubmit: (values: ProductFormValues) => void
  onCancelEdit: () => void
  loading?: boolean
}>) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormInputValues, undefined, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!product) {
      reset(emptyValues)
      return
    }

    reset({
      name: product.name,
      category: product.category,
      description: product.description ?? '',
      unitCost: product.originalUnitCost,
      unitPrice: product.originalUnitPrice,
      currency: product.currency,
      stock: product.stock,
    })
  }, [product, reset])

  return (
    <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            {product ? 'Editar produto' : 'Novo produto'}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {product ? 'Atualize os dados do portfolio.' : 'Cadastre um item para o dashboard.'}
          </h2>
        </div>
        {product ? (
          <Button onClick={onCancelEdit} size="sm" type="button" variant="ghost">
            Cancelar
          </Button>
        ) : null}
      </div>

      <form
        className="mt-6 space-y-5"
        onSubmit={handleSubmit((values) => {
          onSubmit(values)
          if (!product) {
            reset(emptyValues)
          }
        })}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField error={errors.name?.message} label="Nome" placeholder="Produto Alpha" {...register('name')} />
          <InputField error={errors.category?.message} label="Categoria" placeholder="Bebidas" {...register('category')} />
        </div>

        <InputField
          error={errors.description?.message}
          hint="Use uma descricao curta e objetiva."
          label="Descricao"
          placeholder="Produto base para operacao e simulacao financeira."
          {...register('description')}
        />

        <div className="grid gap-5 sm:grid-cols-3">
          <InputField error={errors.unitCost?.message} label="Custo unitario" step="0.01" type="number" {...register('unitCost')} />
          <InputField error={errors.unitPrice?.message} label="Preco unitario" step="0.01" type="number" {...register('unitPrice')} />
          <SelectField error={errors.currency?.message} label="Moeda" options={currencyOptions} {...register('currency')} />
        </div>

        <div className="grid gap-5 sm:grid-cols-1">
          <InputField error={errors.stock?.message} label="Estoque" step="1" type="number" {...register('stock')} />
        </div>

        <Button fullWidth loading={loading} size="lg" type="submit">
          {product ? 'Salvar alteracoes' : 'Cadastrar produto'}
        </Button>
      </form>
    </div>
  )
}
