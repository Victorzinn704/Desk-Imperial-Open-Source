'use client'

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ProductRecord } from '@contracts/contracts'
import { currencyOptions } from '@/lib/currency'
import { buildStockTotalUnits, formatMeasurement } from '@/lib/product-packaging'
import {
  customMeasurementOption,
  findPackagingPresetByLabel,
  getMeasurementOption,
  manualPackagingOption,
  measurementUnitOptions,
  productPackagingPresets,
} from '@/lib/product-packaging'
import { productSchema, type ProductFormInputValues, type ProductFormValues } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { FormSection, FormShell, FormStat } from '@/components/shared/form-layout'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'

const emptyValues: ProductFormInputValues = {
  name: '',
  brand: '',
  category: '',
  packagingClass: '',
  measurementUnit: 'UN',
  measurementValue: 1,
  unitsPerPackage: 1,
  description: '',
  unitCost: 0,
  unitPrice: 0,
  currency: 'BRL',
  stockPackages: 0,
  stockLooseUnits: 0,
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
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormInputValues, undefined, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyValues,
  })

  const packagingClassValue = useWatch({ control, name: 'packagingClass' }) ?? ''
  const measurementUnitValue = useWatch({ control, name: 'measurementUnit' }) ?? 'UN'
  const measurementValue = Number(useWatch({ control, name: 'measurementValue' }) ?? 1)
  const unitsPerPackage = Number(useWatch({ control, name: 'unitsPerPackage' }) ?? 1)
  const stockPackages = Number(useWatch({ control, name: 'stockPackages' }) ?? 0)
  const stockLooseUnits = Number(useWatch({ control, name: 'stockLooseUnits' }) ?? 0)
  const selectedPreset = findPackagingPresetByLabel(packagingClassValue)?.key ?? (packagingClassValue ? manualPackagingOption : '')
  const measurementMode = getMeasurementOption(measurementUnitValue)
  const selectedPresetIsManual = selectedPreset === manualPackagingOption
  const manualMeasurementMode = measurementMode === customMeasurementOption
  const calculatedStockTotal = buildStockTotalUnits(stockPackages, stockLooseUnits, unitsPerPackage)
  const selectedPresetLabel =
    productPackagingPresets.find((preset) => preset.key === selectedPreset)?.label ??
    (selectedPresetIsManual ? packagingClassValue || 'Classe personalizada' : 'Sem classe definida')

  useEffect(() => {
    if (!product) {
      reset(emptyValues)
      return
    }

    reset({
      name: product.name,
      brand: product.brand ?? '',
      category: product.category,
      packagingClass: product.packagingClass,
      measurementUnit: product.measurementUnit,
      measurementValue: product.measurementValue,
      unitsPerPackage: product.unitsPerPackage,
      description: product.description ?? '',
      unitCost: product.originalUnitCost,
      unitPrice: product.originalUnitPrice,
      currency: product.currency,
      stockPackages: product.stockPackages,
      stockLooseUnits: product.stockLooseUnits,
    })
  }, [product, reset])

  const packagingPresetOptions = [
    { label: 'Selecione uma classe padrão', value: '' },
    ...productPackagingPresets.map((preset) => ({
      label: preset.label,
      value: preset.key,
    })),
    { label: 'Outro', value: manualPackagingOption },
  ]

  const handlePresetChange = (presetKey: string) => {
    if (!presetKey) {
      setValue('packagingClass', '', { shouldDirty: true, shouldValidate: true })
      return
    }

    if (presetKey === manualPackagingOption) {
      if (!packagingClassValue) {
        setValue('packagingClass', '', { shouldDirty: true, shouldValidate: true })
      }
      return
    }

    const preset = productPackagingPresets.find((entry) => entry.key === presetKey)
    if (!preset) {
      return
    }

    setValue('packagingClass', preset.label, { shouldDirty: true, shouldValidate: true })
    setValue('measurementUnit', preset.measurementUnit, { shouldDirty: true, shouldValidate: true })
    setValue('measurementValue', preset.measurementValue, { shouldDirty: true, shouldValidate: true })
    setValue('unitsPerPackage', preset.unitsPerPackage, { shouldDirty: true, shouldValidate: true })
  }

  const handleMeasurementModeChange = (nextValue: string) => {
    if (nextValue === customMeasurementOption) {
      setValue('measurementUnit', '', { shouldDirty: true, shouldValidate: true })
      return
    }

    setValue('measurementUnit', nextValue, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <FormShell
      aside={
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <FormStat
            hint="Classe operacional aplicada ao item"
            label="Classe ativa"
            value={selectedPresetLabel || 'Sem classe'}
          />
          <FormStat
            hint="Cada unidade vendida"
            label="Conteúdo"
            value={formatMeasurement(measurementValue, measurementUnitValue || 'UN')}
          />
          <FormStat
            hint="Caixas e unidades soltas somadas"
            label="Estoque calculado"
            value={`${calculatedStockTotal} und`}
          />
        </div>
      }
      description="Estruture o portfólio com padrão operacional, leitura financeira e consistência de estoque. O cadastro agora fica organizado por identidade, logística, preço e disponibilidade."
      eyebrow={product ? 'Editar produto' : 'Novo produto'}
      id="product-form"
      title={product ? 'Atualize um item do portfólio' : 'Cadastre um item para a operação'}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm leading-7 text-[var(--text-soft)]">
          Esse formulário alimenta estoque, margem, rentabilidade e leitura executiva do Desk Imperial.
        </p>
        {product ? (
          <Button onClick={onCancelEdit} size="sm" type="button" variant="ghost">
            Cancelar
          </Button>
        ) : null}
      </div>

      <form
        className="space-y-6"
        onSubmit={handleSubmit((values) => {
        onSubmit(values)
        if (!product) {
          reset(emptyValues)
        }
      })}
      >
        <FormSection
          description="Defina como o item será encontrado, classificado e reconhecido pela equipe no dia a dia."
          index="01"
          title="Identidade comercial"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <InputField error={errors.name?.message} label="Nome" placeholder="Produto Alpha" {...register('name')} />
            <InputField error={errors.brand?.message} label="Marca" placeholder="Coca-Cola, Brahma, Guarana..." {...register('brand')} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <InputField error={errors.category?.message} label="Categoria" placeholder="Bebidas" {...register('category')} />
            <SelectField
              error={!selectedPresetIsManual ? errors.packagingClass?.message : undefined}
              hint="Escolha um perfil pronto ou use Outro para criar um formato próprio."
              label="Classe de cadastro"
              onChange={(event) => handlePresetChange(event.currentTarget.value)}
              options={packagingPresetOptions}
              value={selectedPreset}
            />
          </div>

          {selectedPresetIsManual ? (
            <InputField
              error={errors.packagingClass?.message}
              hint="Descreva como esse item entra no estoque: caixa, fardo, pacote ou outro formato."
              label="Classe personalizada"
              placeholder="Ex.: Caixa com 10 und de 1kg"
              {...register('packagingClass')}
            />
          ) : (
            <>
              <div className="rounded-[22px] border border-white/6 bg-[rgba(255,255,255,0.025)] px-4 py-4 text-sm text-[var(--text-soft)]">
                <p className="font-medium text-white">Classe ativa</p>
                <p className="mt-2">{packagingClassValue || 'Selecione um dos padrões para preencher automaticamente.'}</p>
              </div>
              <input type="hidden" value={packagingClassValue} {...register('packagingClass')} />
            </>
          )}
        </FormSection>

        <FormSection
          description="Padronize unidade de medida, conteúdo e composição por caixa para garantir estoque, importação e leitura financeira consistentes."
          index="02"
          title="Estrutura logística"
        >
          <div className="grid gap-5 sm:grid-cols-[1.1fr_0.9fr_0.9fr]">
            <SelectField
              error={manualMeasurementMode ? undefined : errors.measurementUnit?.message}
              hint="Use ml, L, kg, g, unidade ou crie outra medida."
              label="Medida"
              onChange={(event) => handleMeasurementModeChange(event.currentTarget.value)}
              options={measurementUnitOptions}
              value={measurementMode}
            />
            <InputField
              error={errors.measurementValue?.message}
              hint="Ex.: cada lata tem 350 ml, cada garrafa tem 2 L, cada pacote tem 1 kg."
              label="Conteúdo por unidade"
              placeholder="350"
              step="0.01"
              type="number"
              {...register('measurementValue')}
            />
            <InputField
              error={errors.unitsPerPackage?.message}
              hint="Quantidade dentro da caixa, fardo ou pacote."
              label="Qtde por caixa/fardo"
              step="1"
              type="number"
              {...register('unitsPerPackage')}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="imperial-card-stat px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Cada unidade</p>
              <p className="mt-2 text-base font-semibold text-white">
                {formatMeasurement(measurementValue, measurementUnitValue || 'UN')}
              </p>
            </div>
            <div className="imperial-card-stat px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Cada caixa/fardo</p>
              <p className="mt-2 text-base font-semibold text-white">{unitsPerPackage} und</p>
            </div>
            <div className="imperial-card-stat px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Estoque calculado</p>
              <p className="mt-2 text-base font-semibold text-white">{calculatedStockTotal} und</p>
            </div>
          </div>

          {manualMeasurementMode ? (
            <InputField
              error={errors.measurementUnit?.message}
              label="Outra unidade de medida"
              placeholder="Ex.: pacote, saco, porção"
              {...register('measurementUnit')}
            />
          ) : (
            <input type="hidden" value={measurementUnitValue} {...register('measurementUnit')} />
          )}
        </FormSection>

        <FormSection
          description="Registre valores de referência para abastecer margem, comparativos e potencial de caixa."
          index="03"
          title="Precificação"
        >
          <InputField
            error={errors.description?.message}
            hint="Use uma descrição curta e objetiva."
            label="Descrição"
            placeholder="Produto base para operação e simulação financeira."
            {...register('description')}
          />

          <div className="grid gap-5 sm:grid-cols-3">
            <InputField error={errors.unitCost?.message} label="Custo unitário" step="0.01" type="number" {...register('unitCost')} />
            <InputField error={errors.unitPrice?.message} label="Preço unitário" step="0.01" type="number" {...register('unitPrice')} />
            <SelectField error={errors.currency?.message} label="Moeda" options={currencyOptions} {...register('currency')} />
          </div>
        </FormSection>

        <FormSection
          description="Separe estoque fechado e avulso para manter o cadastro compatível com compra, venda e controle interno."
          index="04"
          title="Disponibilidade"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <InputField
              error={errors.stockPackages?.message}
              hint="Se comprou uma caixa ou fardo fechado, registre aqui."
              label="Caixas / fardos em estoque"
              step="1"
              type="number"
              {...register('stockPackages')}
            />
            <InputField
              error={errors.stockLooseUnits?.message}
              hint={
                unitsPerPackage > 1
                  ? `Use para unidades soltas. Aqui o máximo natural é ${unitsPerPackage - 1} und antes de virar outra caixa/fardo.`
                  : 'Se esse item entra solto no estoque, deixe caixa/fardo em 0 e registre tudo aqui.'
              }
              label="Unidades avulsas em estoque"
              step="1"
              type="number"
              {...register('stockLooseUnits')}
            />
          </div>
        </FormSection>

        <Button fullWidth loading={loading} size="lg" type="submit">
          {product ? 'Salvar alterações' : 'Cadastrar produto'}
        </Button>
      </form>
    </FormShell>
  )
}
