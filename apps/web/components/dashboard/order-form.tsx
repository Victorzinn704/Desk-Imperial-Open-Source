'use client'

import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ProductRecord } from '@contracts/contracts'
import type { EmployeeRecord } from '@/lib/api'
import { currencyOptions } from '@/lib/currency'
import { orderSchema, type OrderFormInputValues, type OrderFormValues } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'

const emptyValues: OrderFormInputValues = {
  productId: '',
  quantity: 1,
  customerName: '',
  buyerType: 'PERSON',
  buyerDocument: '',
  buyerDistrict: '',
  buyerCity: '',
  buyerState: '',
  buyerCountry: 'Brasil',
  sellerEmployeeId: '',
  currency: 'BRL',
  channel: '',
  notes: '',
  unitPrice: undefined,
}

export function OrderForm({
  employees,
  products,
  onSubmit,
  loading,
}: Readonly<{
  employees: EmployeeRecord[]
  products: ProductRecord[]
  onSubmit: (values: OrderFormValues) => void
  loading?: boolean
}>) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
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
  const employeeOptions = useMemo(
    () => [
      { label: 'Venda sem funcionario vinculado', value: '' },
      ...employees
        .filter((employee) => employee.active)
        .map((employee) => ({
          label: `${employee.employeeCode} • ${employee.displayName}`,
          value: employee.id,
        })),
    ],
    [employees],
  )

  const buyerType = useWatch({ control, name: 'buyerType' })
  const selectedProductId = useWatch({ control, name: 'productId' })
  const documentLabel = buyerType === 'COMPANY' ? 'CNPJ do comprador' : 'CPF do comprador'
  const documentPlaceholder =
    buyerType === 'COMPANY' ? '12.345.678/0001-90' : '123.456.789-09'
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0] ?? null

  useEffect(() => {
    if (!selectedProduct) {
      return
    }

    setValue('currency', selectedProduct.currency, {
      shouldDirty: false,
      shouldValidate: true,
    })
  }, [selectedProduct, setValue])

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
          <SelectField error={errors.currency?.message} label="Moeda da venda" options={currencyOptions} {...register('currency')} />
        </div>

        <SelectField
          error={errors.sellerEmployeeId?.message}
          hint="Selecione o vendedor para alimentar ranking, ticket medio e rendimento individual."
          label="Funcionario responsavel"
          options={employeeOptions}
          {...register('sellerEmployeeId')}
        />

        <div className="grid gap-5 sm:grid-cols-1">
          <InputField
            error={errors.unitPrice?.message}
            hint="Se ficar em branco, usamos o preco cadastrado no produto."
            label="Valor unitario da venda"
            placeholder="42.90"
            step="0.01"
            type="number"
            {...register('unitPrice')}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            error={errors.customerName?.message}
            label="Comprador"
            placeholder="Cliente Demo"
            {...register('customerName')}
          />
          <SelectField
            error={errors.buyerType?.message}
            label="Tipo de comprador"
            options={[
              { label: 'Pessoa fisica', value: 'PERSON' },
              { label: 'Empresa', value: 'COMPANY' },
            ]}
            {...register('buyerType')}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            error={errors.buyerDocument?.message}
            label={documentLabel}
            placeholder={documentPlaceholder}
            {...register('buyerDocument')}
          />
          <InputField
            error={errors.buyerDistrict?.message}
            label="Bairro / regiao"
            placeholder="Centro"
            {...register('buyerDistrict')}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            error={errors.buyerCity?.message}
            label="Cidade da venda"
            placeholder="Sao Paulo"
            {...register('buyerCity')}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <InputField
            error={errors.buyerState?.message}
            label="Estado / regiao"
            placeholder="SP"
            {...register('buyerState')}
          />
          <InputField
            error={errors.buyerCountry?.message}
            label="Pais"
            placeholder="Brasil"
            {...register('buyerCountry')}
          />
          <InputField
            error={errors.channel?.message}
            label="Canal"
            placeholder="Marketplace"
            {...register('channel')}
          />
        </div>

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
