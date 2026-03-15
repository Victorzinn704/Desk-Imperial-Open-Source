'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ProductRecord } from '@contracts/contracts'
import { orderSchema, type OrderFormInputValues, type OrderFormValues } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'

const emptyValues: OrderFormInputValues = {
  productId: '',
  quantity: 1,
  customerName: '',
  channel: '',
  notes: '',
}

export function OrderForm({
  products,
  onSubmit,
  loading,
}: Readonly<{
  products: ProductRecord[]
  onSubmit: (values: OrderFormValues) => void
  loading?: boolean
}>) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrderFormInputValues, undefined, OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      ...emptyValues,
      productId: products[0]?.id ?? '',
    },
  })

  const options = useMemo(
    () => [
      { label: 'Selecione um produto', value: '' },
      ...products.map((product) => ({
        label: `${product.name} • estoque ${product.stock}`,
        value: product.id,
      })),
    ],
    [products],
  )

  return (
    <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Pedido rapido</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Registre uma venda real no painel.</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
          Cada pedido baixa estoque, entra no financeiro realizado e fica disponivel para cancelamento com estorno de unidades.
        </p>
      </div>

      <form
        className="mt-6 space-y-5"
        onSubmit={handleSubmit((values) => {
          onSubmit(values)
          reset({
            ...emptyValues,
            productId: products[0]?.id ?? '',
          })
        })}
      >
        <SelectField
          error={errors.productId?.message}
          label="Produto"
          options={options}
          {...register('productId')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <InputField error={errors.quantity?.message} label="Quantidade" step="1" type="number" {...register('quantity')} />
          <InputField error={errors.channel?.message} label="Canal" placeholder="Marketplace" {...register('channel')} />
        </div>

        <InputField
          error={errors.customerName?.message}
          label="Cliente"
          placeholder="Cliente Demo"
          {...register('customerName')}
        />

        <InputField
          error={errors.notes?.message}
          hint="Campo opcional para observacoes rapidas do pedido."
          label="Observacoes"
          placeholder="Entrega rapida, pedido via app."
          {...register('notes')}
        />

        <Button disabled={!products.length} fullWidth loading={loading} size="lg" type="submit">
          Registrar pedido
        </Button>
      </form>
    </div>
  )
}
