'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import type { ProductRecord } from '@contracts/contracts'
import type { EmployeeRecord } from '@/lib/api'
import { currencyOptions, formatCurrency } from '@/lib/currency'
import { formatStockBreakdown } from '@/lib/product-packaging'
import { orderSchema, type OrderFormInputValues, type OrderFormValues } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'

const emptyValues: OrderFormInputValues = {
  items: [],
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
}

type CartItemValue = {
  productId: string
  quantity: number
  unitPrice?: number
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
  const [draftProductId, setDraftProductId] = useState(products[0]?.id ?? '')
  const [draftQuantity, setDraftQuantity] = useState('1')
  const [draftUnitPrice, setDraftUnitPrice] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<OrderFormInputValues, undefined, OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      ...emptyValues,
      currency: products[0]?.currency ?? 'BRL',
    },
  })

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items',
  })

  const currentItems = (useWatch({
    control,
    name: 'items',
  }) as CartItemValue[] | undefined) ?? []
  const buyerType = useWatch({ control, name: 'buyerType' })
  const orderCurrency = useWatch({ control, name: 'currency' })
  const documentLabel = buyerType === 'COMPANY' ? 'CNPJ do comprador' : 'CPF do comprador'
  const documentPlaceholder =
    buyerType === 'COMPANY' ? '12.345.678/0001-90' : '123.456.789-09'

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.active),
    [employees],
  )
  const employeeOptions = useMemo(
    () => [
      {
        label:
          activeEmployees.length > 0
            ? 'Selecione o vendedor responsavel'
            : 'Cadastre um funcionario para vincular a venda',
        value: '',
      },
      ...activeEmployees.map((employee) => ({
        label: `${employee.employeeCode} • ${employee.displayName}`,
        value: employee.id,
      })),
    ],
    [activeEmployees],
  )
  const productOptions = useMemo(
    () => [
      { label: 'Selecione um produto', value: '' },
      ...products.map((product) => ({
        label: `${product.name} • ${formatStockBreakdown(product.stock, product.unitsPerPackage, { compact: true })} (${product.stock} und)`,
        value: product.id,
      })),
    ],
    [products],
  )

  const selectedDraftProduct = products.find((product) => product.id === draftProductId) ?? null
  const itemsError = typeof errors.items?.message === 'string' ? errors.items.message : undefined
  const totalCartUnits = currentItems.reduce((total, item) => total + Number(item.quantity ?? 0), 0)
  const selectedStockLabel = selectedDraftProduct
    ? formatStockBreakdown(selectedDraftProduct.stock, selectedDraftProduct.unitsPerPackage)
    : 'Selecione um produto'

  useEffect(() => {
    if (!products.length) {
      setDraftProductId('')
      return
    }

    const draftStillExists = products.some((product) => product.id === draftProductId)
    if (!draftProductId || !draftStillExists) {
      setDraftProductId(products[0]?.id ?? '')
    }
  }, [draftProductId, products])

  useEffect(() => {
    if (!selectedDraftProduct || currentItems.length > 0) {
      return
    }

    setValue('currency', selectedDraftProduct.currency, {
      shouldDirty: false,
      shouldValidate: true,
    })
  }, [currentItems.length, selectedDraftProduct, setValue])

  const handleAddItem = () => {
    const product = products.find((item) => item.id === draftProductId)

    if (!product) {
      setError('items', {
        type: 'manual',
        message: 'Selecione um produto para adicionar ao pedido.',
      })
      return
    }

    const quantity = Number.parseInt(draftQuantity, 10)
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('items', {
        type: 'manual',
        message: 'Use uma quantidade inteira maior que zero.',
      })
      return
    }

    const normalizedUnitPrice =
      draftUnitPrice.trim() === '' ? undefined : Number(draftUnitPrice.replace(',', '.'))

    if (
      normalizedUnitPrice !== undefined &&
      (!Number.isFinite(normalizedUnitPrice) || normalizedUnitPrice < 0)
    ) {
      setError('items', {
        type: 'manual',
        message: 'O valor unitario precisa ser zero ou positivo.',
      })
      return
    }

    const requestedForProduct = currentItems.reduce((total, item) => {
      if (item.productId !== product.id) {
        return total
      }

      return total + Number(item.quantity ?? 0)
    }, 0)

    if (requestedForProduct + quantity > product.stock) {
      setError('items', {
        type: 'manual',
        message: `Estoque insuficiente para ${product.name}. Disponivel: ${product.stock} und.`,
      })
      return
    }

    const existingIndex = currentItems.findIndex((item) => item.productId === product.id)
    if (existingIndex >= 0) {
      const existingItem = currentItems[existingIndex]
      update(existingIndex, {
        productId: existingItem.productId,
        quantity: Number(existingItem.quantity) + quantity,
        unitPrice: normalizedUnitPrice ?? existingItem.unitPrice,
      })
    } else {
      append({
        productId: product.id,
        quantity,
        unitPrice: normalizedUnitPrice,
      })
    }

    clearErrors('items')
    setDraftQuantity('1')
    setDraftUnitPrice('')
  }

  return (
    <div className="imperial-card p-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Pedido multi-item
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Monte a venda como um carrinho de mercado.
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
          Organizei a operacao em etapas para deixar o preenchimento mais claro: primeiro o carrinho,
          depois a configuracao da venda e por fim os dados do comprador.
        </p>
      </div>

      <form
        className="mt-6 space-y-6"
        onSubmit={handleSubmit((values) => {
          if (activeEmployees.length > 0 && !values.sellerEmployeeId) {
            setError('sellerEmployeeId', {
              type: 'manual',
              message: 'Selecione o vendedor responsavel por esta venda.',
            })
            return
          }

          clearErrors('sellerEmployeeId')
          onSubmit(values)
          reset({
            ...emptyValues,
            currency: products[0]?.currency ?? 'BRL',
          })
          setDraftProductId(products[0]?.id ?? '')
          setDraftQuantity('1')
          setDraftUnitPrice('')
        })}
      >
        <section className="imperial-card-soft p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <span className="mt-1 flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#8fffb9]">
                <ShoppingBasket className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">
                  1. Monte o carrinho
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  Escolha os produtos e adicione cada linha ao pedido
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
                  A quantidade sempre sai em unidade. O valor unitario e opcional e so serve quando
                  voce precisa vender um item com preco diferente do cadastro.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
              <MiniInfo label="Linhas no carrinho" value={String(currentItems.length)} />
              <MiniInfo label="Unidades totais" value={String(totalCartUnits)} />
              <MiniInfo label="Moeda do pedido" value={orderCurrency} />
              <MiniInfo label="Estoque em foco" value={selectedStockLabel} />
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.35fr)_150px_180px_auto] 2xl:items-end">
            <SelectField
              label="Produto"
              onChange={(event) => setDraftProductId(event.currentTarget.value)}
              options={productOptions}
              value={draftProductId}
            />
            <InputField
              hint="Sempre em und."
              label="Quantidade"
              min="1"
              onChange={(event) => setDraftQuantity(event.currentTarget.value)}
              step="1"
              type="number"
              value={draftQuantity}
            />
            <InputField
              hint="Opcional"
              label="Valor unitario"
              onChange={(event) => setDraftUnitPrice(event.currentTarget.value)}
              placeholder="42.90"
              step="0.01"
              type="number"
              value={draftUnitPrice}
            />
            <Button
              className="2xl:mb-[2px]"
              disabled={!products.length}
              onClick={handleAddItem}
              type="button"
            >
              <Plus className="size-4" />
              Adicionar ao pedido
            </Button>
          </div>

          {selectedDraftProduct ? (
            <div className="imperial-card-soft mt-4 px-4 py-3 text-sm leading-7 text-[var(--text-soft)]">
              <span className="font-medium text-white">{selectedDraftProduct.name}</span>
              {` • ${selectedDraftProduct.category} • Estoque ${selectedStockLabel} • Preco base ${formatCurrency(selectedDraftProduct.unitPrice, selectedDraftProduct.displayCurrency)}`}
            </div>
          ) : null}

          {itemsError ? <p className="mt-4 text-sm text-[var(--danger)]">{itemsError}</p> : null}

          <div className="mt-5 space-y-3">
            {fields.length ? (
              fields.map((field, index) => {
                const currentItem = currentItems[index]
                const product = products.find((item) => item.id === field.productId)

                return (
                  <div
                    className="imperial-card-soft px-4 py-4"
                    key={field.id}
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div>
                        <p className="font-medium text-white">
                          {product?.name ?? 'Produto removido do portfolio'}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-soft)]">
                          {product
                            ? `${product.category} • ${formatStockBreakdown(product.stock, product.unitsPerPackage)}`
                            : 'Revisar item antes de concluir a venda.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text-soft)]">
                          {currentItem?.quantity ?? field.quantity} und
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text-soft)]">
                          {currentItem?.unitPrice != null
                            ? `Preco manual ${formatCurrency(currentItem.unitPrice, orderCurrency)}`
                            : 'Preco do cadastro'}
                        </div>
                        <Button onClick={() => remove(index)} size="sm" type="button" variant="ghost">
                          <Trash2 className="size-4" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="imperial-card-soft border-dashed px-4 py-6 text-center">
                <p className="text-lg font-semibold text-white">Seu carrinho ainda esta vazio.</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                  Adicione um ou mais produtos para transformar a operacao em pedido multi-item.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="imperial-card-soft p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                2. Configure a operacao
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                Defina moeda, vendedor e contexto da venda
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[var(--text-soft)]">
              Essa etapa alimenta o ranking da equipe, a analise por canal e o comportamento do pedido
              dentro do painel.
            </p>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <SelectField
              error={errors.currency?.message}
              label="Moeda da venda"
              options={currencyOptions}
              {...register('currency')}
            />
            <SelectField
              error={errors.sellerEmployeeId?.message}
              hint={
                activeEmployees.length > 0
                  ? 'A venda alimenta ranking, ticket medio e desempenho individual.'
                  : 'Cadastre pelo menos um funcionario ativo para atribuir vendas.'
              }
              label="Funcionario responsavel"
              options={employeeOptions}
              {...register('sellerEmployeeId')}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <InputField
              error={errors.channel?.message}
              label="Canal"
              placeholder="Marketplace"
              {...register('channel')}
            />
            <InputField
              error={errors.notes?.message}
              hint="Campo opcional para observacoes rapidas do pedido."
              label="Observacoes"
              placeholder="Entrega rapida, pedido via app."
              {...register('notes')}
            />
          </div>
        </section>

        <section className="imperial-card-soft p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                3. Identifique o comprador
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                Registre quem comprou e de onde saiu a venda
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[var(--text-soft)]">
              Esses dados sustentam mapa de vendas, compliance e leitura do cliente no financeiro.
            </p>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
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

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
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

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <InputField
              error={errors.buyerCity?.message}
              label="Cidade da venda"
              placeholder="Sao Paulo"
              {...register('buyerCity')}
            />
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
          </div>
        </section>

        <Button disabled={!products.length} fullWidth loading={loading} size="lg" type="submit">
          Registrar pedido
        </Button>
      </form>
    </div>
  )
}

function MiniInfo({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="imperial-card-stat px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}
