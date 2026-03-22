'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import type { ProductRecord } from '@contracts/contracts'
import type { EmployeeRecord } from '@/lib/api'
import { currencyOptions, formatCurrency } from '@/lib/currency'
import { formatStockBreakdown } from '@/lib/product-packaging'
import { orderSchema, type OrderFormInputValues, type OrderFormValues } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { FormSection, FormShell, FormStat } from '@/components/shared/form-layout'
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
    draftProductId && products.some((product) => product.id === draftProductId)
      ? draftProductId
      : (products[0]?.id ?? '')
  const selectedDraftProduct = products.find((product) => product.id === resolvedDraftProductId) ?? null
  const itemsError = typeof errors.items?.message === 'string' ? errors.items.message : undefined
  const totalCartUnits = currentItems.reduce((total, item) => total + Number(item.quantity ?? 0), 0)
  const selectedStockLabel = selectedDraftProduct
    ? formatStockBreakdown(selectedDraftProduct.stock, selectedDraftProduct.unitsPerPackage)
    : 'Selecione um produto'

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

    const normalizedUnitPrice =
      draftUnitPrice.trim() === '' ? undefined : Number(draftUnitPrice.replace(',', '.'))

    if (
      normalizedUnitPrice !== undefined &&
      (!Number.isFinite(normalizedUnitPrice) || normalizedUnitPrice < 0)
    ) {
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
    <FormShell
      aside={
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <FormStat
            hint="Quantidade de linhas adicionadas"
            label="Linhas no carrinho"
            value={String(currentItems.length)}
          />
          <FormStat
            hint="Volume total previsto para a venda"
            label="Unidades totais"
            value={String(totalCartUnits)}
          />
          <FormStat
            hint="Moeda do pedido em construção"
            label="Moeda"
            value={orderCurrency}
          />
          <FormStat
            hint="Produto atualmente em foco"
            label="Estoque em foco"
            value={selectedStockLabel}
          />
        </div>
      }
      description="Estruture o registro comercial em etapas claras: carrinho, contexto operacional e identificação do comprador. A lógica continua a mesma, mas a experiência fica mais legível e escalável."
      eyebrow="Pedido multi-item"
      id="order-form"
      title="Registre uma venda com estrutura operacional"
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        O objetivo aqui é reduzir erro operacional e deixar a venda pronta para alimentar financeiro, mapa, ranking de equipe e histórico.
      </p>

      <form
        className="space-y-6"
        onSubmit={handleSubmit((values) => {
          if (activeEmployees.length > 0 && !values.sellerEmployeeId) {
            setError('sellerEmployeeId', {
              type: 'manual',
              message: 'Selecione o vendedor responsável por esta venda.',
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
        <FormSection
          description="Adicione os itens da venda primeiro. Esse passo concentra quantidade, preço manual quando necessário e validação de estoque."
          index="01"
          title="Monte o carrinho"
        >
          <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.35fr)_150px_180px_auto] 2xl:items-end">
            <SelectField
              label="Produto"
              onChange={(event) => setDraftProductId(event.currentTarget.value)}
              options={productOptions}
              value={resolvedDraftProductId}
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
              label="Valor unitário"
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
            <div className="rounded-lg border border-border bg-background mt-4 px-4 py-3 text-sm leading-7 text-muted-foreground shadow-sm">
              <span className="font-medium text-foreground">{selectedDraftProduct.name}</span>
              {` • ${selectedDraftProduct.category} • Estoque ${selectedStockLabel} • Preço base ${formatCurrency(selectedDraftProduct.unitPrice, selectedDraftProduct.displayCurrency)}`}
            </div>
          ) : null}

          {itemsError ? <p className="mt-4 text-sm text-destructive">{itemsError}</p> : null}

          <div className="mt-5 space-y-3">
            {fields.length ? (
              fields.map((field, index) => {
                const currentItem = currentItems[index]
                const product = products.find((item) => item.id === field.productId)

                return (
                  <div
                    className="rounded-lg border border-border bg-background px-4 py-4 shadow-sm"
                    key={field.id}
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div>
                        <p className="font-medium text-foreground">
                          {product?.name ?? 'Produto removido do portfólio'}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {product
                            ? `${product.category} • ${formatStockBreakdown(product.stock, product.unitsPerPackage)}`
                            : 'Revisar item antes de concluir a venda.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-md border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
                          {currentItem?.quantity ?? field.quantity} und
                        </div>
                        <div className="rounded-md border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
                          {currentItem?.unitPrice != null
                            ? `Preço manual ${formatCurrency(currentItem.unitPrice, orderCurrency)}`
                            : 'Preço do cadastro'}
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
              <div className="rounded-lg border-2 border-dashed border-border bg-background/50 px-4 py-6 text-center">
                <p className="text-lg font-semibold text-foreground">Seu carrinho ainda está vazio.</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Adicione um ou mais produtos para transformar a operação em pedido multi-item.
                </p>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection
          description="Vincule contexto comercial, moeda e responsável pela venda. Esses dados sustentam ranking, performance e leitura gerencial."
          index="02"
          title="Configure a operação"
        >
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
                  ? 'A venda alimenta ranking, ticket médio e desempenho individual.'
                  : 'Cadastre pelo menos um funcionário ativo para atribuir vendas.'
              }
              label="Funcionário responsável"
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
              hint="Campo opcional para observações rápidas do pedido."
              label="Observações"
              placeholder="Entrega rápida, pedido via app."
              {...register('notes')}
            />
          </div>
        </FormSection>

        <FormSection
          description="Feche o fluxo com os dados do comprador e da localização. Isso deixa a venda pronta para mapa, auditoria, análise regional e histórico."
          index="03"
          title="Identifique o comprador"
        >
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
        </FormSection>

        <Button disabled={!products.length} fullWidth loading={loading} size="lg" type="submit">
          Registrar pedido
        </Button>
      </form>
    </FormShell>
  )
}
