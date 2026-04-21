'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import type { ProductRecord } from '@contracts/contracts'
import type { EmployeeRecord } from '@/lib/api'
import { AdminPinDialog } from '@/components/admin-pin/admin-pin-dialog'
import { useAdminPin } from '@/components/admin-pin/use-admin-pin'
import { currencyOptions, formatCurrency } from '@/lib/currency'
import { formatStockBreakdown } from '@/lib/product-packaging'
import { type OrderFormInputValues, type OrderFormValues, orderSchema } from '@/lib/validation'
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

function buildOrderDefaults(
  products: ProductRecord[],
  initialValues?: Partial<OrderFormInputValues>,
): OrderFormInputValues {
  return {
    ...emptyValues,
    currency: initialValues?.currency ?? products[0]?.currency ?? 'BRL',
    ...initialValues,
    items: initialValues?.items ?? [],
  }
}

type CartItemValue = {
  productId: string
  quantity: number
  unitPrice?: number
}

function estimateCartTotals(products: ProductRecord[], items: CartItemValue[]) {
  return items.reduce(
    (acc, item) => {
      const product = products.find((entry) => entry.id === item.productId)
      const resolvedUnitPrice = item.unitPrice ?? product?.unitPrice ?? 0
      const lineTotal = resolvedUnitPrice * Number(item.quantity ?? 0)

      return {
        itemsTotal: acc.itemsTotal + lineTotal,
        itemsCount: acc.itemsCount + Number(item.quantity ?? 0),
      }
    },
    { itemsTotal: 0, itemsCount: 0 },
  )
}

export function OrderForm({
  employees,
  products,
  onSubmit,
  loading,
  userRole,
  initialValues,
  channelPreset,
  appearance = 'default',
  submitLabel = 'Registrar pedido',
}: Readonly<{
  employees: EmployeeRecord[]
  products: ProductRecord[]
  onSubmit: (payload: { values: OrderFormValues }) => void
  loading?: boolean
  userRole: 'OWNER' | 'STAFF'
  initialValues?: Partial<OrderFormInputValues>
  channelPreset?: string
  appearance?: 'default' | 'embedded'
  submitLabel?: string
}>) {
  const initialFormValues = useMemo(() => buildOrderDefaults(products, initialValues), [initialValues, products])
  const [draftProductId, setDraftProductId] = useState(initialFormValues.items[0]?.productId ?? products[0]?.id ?? '')
  const [draftQuantity, setDraftQuantity] = useState('1')
  const [draftUnitPrice, setDraftUnitPrice] = useState('')
  const { pinDialogOpen, pinDialogTitle, pinDialogDescription, requirePin, handlePinCancel, handlePinConfirm } =
    useAdminPin()

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
    defaultValues: initialFormValues,
  })

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items',
  })

  const currentItems =
    (useWatch({
      control,
      name: 'items',
    }) as CartItemValue[] | undefined) ?? []
  const buyerType = useWatch({ control, name: 'buyerType' })
  const orderCurrency = useWatch({ control, name: 'currency' })
  const documentLabel = buyerType === 'COMPANY' ? 'CNPJ do comprador' : 'CPF do comprador'
  const documentPlaceholder = buyerType === 'COMPANY' ? '12.345.678/0001-90' : '123.456.789-09'

  const activeEmployees = useMemo(() => employees.filter((employee) => employee.active), [employees])
  const isStaffUser = userRole === 'STAFF'
  const employeeOptions = useMemo(
    () => [
      {
        label:
          activeEmployees.length > 0
            ? 'Selecione o vendedor responsável'
            : 'Cadastre um funcionário para vincular a venda',
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

  const resolvedDraftProductId =
    products.length === 0
      ? ''
      : products.some((product) => product.id === draftProductId)
        ? draftProductId
        : (products[0]?.id ?? '')
  const selectedDraftProduct = products.find((product) => product.id === resolvedDraftProductId) ?? null
  const itemsError = typeof errors.items?.message === 'string' ? errors.items.message : undefined
  const totalCartUnits = currentItems.reduce((total, item) => total + Number(item.quantity ?? 0), 0)
  const estimatedCart = useMemo(() => estimateCartTotals(products, currentItems), [currentItems, products])
  const selectedStockLabel = selectedDraftProduct
    ? formatStockBreakdown(selectedDraftProduct.stock, selectedDraftProduct.unitsPerPackage)
    : 'Selecione um produto'
  const isEmbedded = appearance === 'embedded'

  const submitOrder = (values: OrderFormValues) => {
    onSubmit({ values })
    reset(buildOrderDefaults(products, initialValues))
    setDraftProductId(initialValues?.items?.[0]?.productId ?? products[0]?.id ?? '')
    setDraftQuantity('1')
    setDraftUnitPrice('')
  }

  useEffect(() => {
    reset(initialFormValues)
    setDraftProductId(initialFormValues.items[0]?.productId ?? products[0]?.id ?? '')
    setDraftQuantity('1')
    setDraftUnitPrice('')
  }, [initialFormValues, products, reset])

  useEffect(() => {
    if (!selectedDraftProduct || currentItems.length > 0) {
      return
    }

    setValue('currency', selectedDraftProduct.currency, {
      shouldDirty: false,
      shouldValidate: true,
    })
  }, [currentItems.length, selectedDraftProduct, setValue])

  useEffect(() => {
    if (!channelPreset) {
      return
    }

    setValue('channel', channelPreset, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [channelPreset, setValue])

  const handleAddItem = () => {
    const product = products.find((item) => item.id === resolvedDraftProductId)

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

    const normalizedUnitPrice = draftUnitPrice.trim() === '' ? undefined : Number(draftUnitPrice.replace(',', '.'))

    if (normalizedUnitPrice !== undefined && (!Number.isFinite(normalizedUnitPrice) || normalizedUnitPrice < 0)) {
      setError('items', {
        type: 'manual',
        message: 'O valor unitário precisa ser zero ou positivo.',
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
        message: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock} und.`,
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
    <div className={isEmbedded ? 'min-w-0' : 'imperial-card p-7'}>
      {isEmbedded ? null : (
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Pedido multi-item</p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            Monte a venda como um carrinho de mercado.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
            Organizei a operação em etapas para deixar o preenchimento mais claro: primeiro o carrinho, depois a
            configuração da venda e por fim os dados do comprador.
          </p>
        </div>
      )}

      <form
        className={isEmbedded ? 'space-y-8' : 'mt-6 space-y-6'}
        onSubmit={handleSubmit((values) => {
          if (!isStaffUser && activeEmployees.length > 0 && !values.sellerEmployeeId) {
            setError('sellerEmployeeId', {
              type: 'manual',
              message: 'Selecione o vendedor responsável por esta venda.',
            })
            return
          }

          clearErrors('sellerEmployeeId')

          const hasManualPrice = values.items.some((item) => item.unitPrice != null)
          if (hasManualPrice) {
            requirePin(() => submitOrder(values), {
              title: 'Validação de desconto',
              description: 'Digite o PIN do dono para confirmar preco manual ou desconto nesta venda.',
            })
            return
          }

          submitOrder(values)
        })}
      >
        <section className={isEmbedded ? 'space-y-5' : 'imperial-card-soft p-5'}>
          {isEmbedded ? (
            <>
              <EmbeddedSectionHeader
                description="Adicione os itens da venda e ajuste preco manual apenas quando precisar."
                eyebrow="Carrinho"
                title="Itens da venda"
              />
              <div className="flex flex-wrap gap-2">
                <InlineFact label="linhas" value={String(currentItems.length)} />
                <InlineFact label="unidades" value={String(totalCartUnits)} />
                <InlineFact label="total" value={formatCurrency(estimatedCart.itemsTotal, orderCurrency)} />
                <InlineFact label="estoque em foco" value={selectedStockLabel} />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-4">
                <span className="mt-1 flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#8fffb9]">
                  <ShoppingBasket className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">1. Monte o carrinho</p>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                    Escolha os produtos e adicione cada linha ao pedido
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
                    A quantidade sempre sai em unidade. O valor unitário é opcional e só serve quando você precisa vender
                    um item com preço diferente do cadastro. Descontos pedem PIN do dono quando ele estiver configurado.
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
          )}

          <div
            className={
              isEmbedded
                ? 'grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,140px)_minmax(0,170px)_minmax(0,190px)] lg:items-end'
                : 'mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.35fr)_150px_180px_auto] 2xl:items-end'
            }
          >
            <SelectField
              label="Produto"
              options={productOptions}
              value={resolvedDraftProductId}
              onChange={(event) => setDraftProductId(event.currentTarget.value)}
            />
            <InputField
              hint="Sempre em und."
              label="Quantidade"
              min="1"
              step="1"
              type="number"
              value={draftQuantity}
              onChange={(event) => setDraftQuantity(event.currentTarget.value)}
            />
            <InputField
              hint="Opcional"
              label="Valor unitário"
              placeholder="42.90"
              step="0.01"
              type="number"
              value={draftUnitPrice}
              onChange={(event) => setDraftUnitPrice(event.currentTarget.value)}
            />
            <Button
              className="2xl:mb-[2px] whitespace-nowrap"
              disabled={!products.length}
              type="button"
              onClick={handleAddItem}
            >
              <Plus className="size-4" />
              {isEmbedded ? 'Adicionar item' : 'Adicionar ao pedido'}
            </Button>
          </div>

          {selectedDraftProduct ? (
            <div
              className={
                isEmbedded
                  ? 'grid gap-3 border-t border-dashed border-[var(--border)] pt-4 text-sm leading-7 text-[var(--text-soft)] sm:grid-cols-3'
                  : 'imperial-card-soft mt-4 px-4 py-3 text-sm leading-7 text-[var(--text-soft)]'
              }
            >
              {isEmbedded ? (
                <>
                  <InlineFact label="produto" value={selectedDraftProduct.name} />
                  <InlineFact label="estoque" value={selectedStockLabel} />
                  <InlineFact
                    label="preço base"
                    value={formatCurrency(selectedDraftProduct.unitPrice, selectedDraftProduct.displayCurrency)}
                  />
                </>
              ) : (
                <>
                  <span className="font-medium text-[var(--text-primary)]">{selectedDraftProduct.name}</span>
                  {` • ${selectedDraftProduct.category} • Estoque ${selectedStockLabel} • Preço base ${formatCurrency(selectedDraftProduct.unitPrice, selectedDraftProduct.displayCurrency)}`}
                </>
              )}
            </div>
          ) : null}

          {itemsError ? <p className="mt-4 text-sm text-[var(--danger)]">{itemsError}</p> : null}

          <div
            className={
              isEmbedded
                ? 'mt-5 divide-y divide-dashed divide-[var(--border)] border-t border-dashed border-[var(--border)]'
                : 'mt-5 space-y-3'
            }
          >
            {isEmbedded && fields.length ? (
              <div className="grid gap-3 py-3 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] lg:grid-cols-[minmax(0,1.7fr)_110px_90px_130px_auto]">
                <span>Item</span>
                <span className="text-right">Unit.</span>
                <span className="text-right">Qtd.</span>
                <span className="text-right">Total</span>
                <span className="text-right">Ação</span>
              </div>
            ) : null}
            {fields.length ? (
              fields.map((field, index) => {
                const currentItem = currentItems[index]
                const product = products.find((item) => item.id === field.productId)
                const resolvedUnitPrice = currentItem?.unitPrice ?? product?.unitPrice ?? 0
                const resolvedQuantity = Number(currentItem?.quantity ?? field.quantity ?? 0)
                const lineTotal = resolvedUnitPrice * resolvedQuantity

                return (
                  <div
                    className={
                      isEmbedded
                        ? 'grid gap-4 py-4 lg:grid-cols-[minmax(0,1.7fr)_110px_90px_130px_auto] lg:items-center'
                        : 'imperial-card-soft px-4 py-4'
                    }
                    key={field.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-primary)]">
                        {product?.name ?? 'Produto removido do portfólio'}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-soft)]">
                        {product
                          ? `${product.category} • ${formatStockBreakdown(product.stock, product.unitsPerPackage)}`
                          : 'Revisar item antes de concluir a venda.'}
                      </p>
                    </div>

                    {isEmbedded ? (
                      <>
                        <div className="text-right text-sm text-[var(--text-soft)]">
                          {currentItem?.unitPrice != null ? formatCurrency(resolvedUnitPrice, orderCurrency) : 'cadastro'}
                        </div>
                        <div className="text-right text-sm text-[var(--text-primary)]">{resolvedQuantity}</div>
                        <div className="text-right text-sm font-medium text-[var(--text-primary)]">
                          {formatCurrency(lineTotal, orderCurrency)}
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" type="button" variant="ghost" onClick={() => remove(index)}>
                            <Trash2 className="size-4" />
                            Remover
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-soft)]">
                          {currentItem?.quantity ?? field.quantity} und
                        </div>
                        <div className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-soft)]">
                          {currentItem?.unitPrice != null
                            ? `Preço manual ${formatCurrency(currentItem.unitPrice, orderCurrency)}`
                            : 'Preço do cadastro'}
                        </div>
                        <Button size="sm" type="button" variant="ghost" onClick={() => remove(index)}>
                          <Trash2 className="size-4" />
                          Remover
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div
                className={
                  isEmbedded
                    ? 'rounded-[16px] border border-dashed border-[var(--border)] px-4 py-6 text-center'
                    : 'imperial-card-soft border-dashed px-4 py-6 text-center'
                }
              >
                <p className="text-lg font-semibold text-[var(--text-primary)]">Seu carrinho ainda está vazio.</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                  Adicione um ou mais produtos para transformar a operação em pedido multi-item.
                </p>
              </div>
            )}
          </div>

          {isEmbedded && fields.length ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[var(--border)] pt-4">
              <div className="flex flex-wrap gap-2">
                <InlineFact label="linhas ativas" value={String(fields.length)} />
                <InlineFact label="unidades" value={String(estimatedCart.itemsCount)} />
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Subtotal estimado</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {formatCurrency(estimatedCart.itemsTotal, orderCurrency)}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <section className={isEmbedded ? 'space-y-5 border-t border-dashed border-[var(--border)] pt-6' : 'imperial-card-soft p-5'}>
          {isEmbedded ? (
            <EmbeddedSectionHeader
              description="Moeda, responsável e canal ficam no mesmo bloco, sem desviar a leitura."
              eyebrow="Operação"
              title="Contexto da venda"
            />
          ) : (
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  2. Configure a operação
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  Defina moeda, vendedor e contexto da venda
                </h3>
              </div>
              <p className="max-w-xl text-sm leading-7 text-[var(--text-soft)]">
                Essa etapa alimenta o ranking da equipe, a análise por canal e o comportamento do pedido dentro do painel.
              </p>
            </div>
          )}

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <SelectField
              error={errors.currency?.message}
              label="Moeda da venda"
              options={currencyOptions}
              {...register('currency')}
            />
            {isStaffUser ? (
              <div
                className={
                  isEmbedded
                    ? 'border-t border-dashed border-[var(--border)] pt-4'
                    : 'imperial-card-stat px-4 py-3'
                }
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Responsável pela venda
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                  Seu acesso será vinculado automaticamente.
                </p>
                <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">
                  O sistema grava sua autoria em tempo real para auditoria da empresa.
                </p>
              </div>
            ) : (
              <SelectField
                error={errors.sellerEmployeeId?.message}
                hint={
                  activeEmployees.length > 0
                    ? 'A venda alimenta ranking, ticket médio e desempenho individual.'
                    : 'Cadastre pelo menos um funcionário ativo para atribuir vendas.'
                }
                label="Funcionário responsável"
                options={employeeOptions}
                {...register('sellerEmployeeId')}
              />
            )}
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
              hint="Campo opcional para observações rápidas do pedido."
              label="Observações"
              placeholder="Entrega rápida, pedido via app."
              {...register('notes')}
            />
          </div>
        </section>

        <section className={isEmbedded ? 'space-y-5 border-t border-dashed border-[var(--border)] pt-6' : 'imperial-card-soft p-5'}>
          {isEmbedded ? (
            <EmbeddedSectionHeader
              description="Os campos de comprador e localização continuam vivos, mas em um bloco mais objetivo."
              eyebrow="Comprador"
              title="Identificação e localização"
            />
          ) : (
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  3. Identifique o comprador
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  Registre quem comprou e de onde saiu a venda
                </h3>
              </div>
              <p className="max-w-xl text-sm leading-7 text-[var(--text-soft)]">
                Esses dados sustentam mapa de vendas, compliance e leitura do cliente no financeiro.
              </p>
            </div>
          )}

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
                { label: 'Pessoa física', value: 'PERSON' },
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

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <InputField
              error={errors.buyerCity?.message}
              label="Cidade da venda"
              placeholder="São Paulo"
              {...register('buyerCity')}
            />
            <InputField
              error={errors.buyerState?.message}
              label="Estado"
              placeholder="SP"
              {...register('buyerState')}
            />
          </div>
        </section>

        {isEmbedded ? (
          <div className="flex justify-end border-t border-dashed border-[var(--border)] pt-6">
            <Button disabled={!products.length} loading={loading} size="lg" type="submit">
              {submitLabel}
            </Button>
          </div>
        ) : (
          <Button fullWidth disabled={!products.length} loading={loading} size="lg" type="submit">
            {submitLabel}
          </Button>
        )}
      </form>

      {pinDialogOpen ? (
        <AdminPinDialog
          description={pinDialogDescription}
          title={pinDialogTitle}
          onCancel={handlePinCancel}
          onConfirm={handlePinConfirm}
        />
      ) : null}
    </div>
  )
}

function EmbeddedSectionHeader({
  eyebrow,
  title,
  description,
}: Readonly<{
  eyebrow: string
  title: string
  description: string
}>) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="text-sm leading-6 text-[var(--text-soft)]">{description}</p>
    </div>
  )
}

function InlineFact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-soft)]">
      <span className="uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
      <span className="font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  )
}

function MiniInfo({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="imperial-card-stat px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}
