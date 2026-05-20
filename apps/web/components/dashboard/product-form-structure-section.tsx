import { formatMeasurement, measurementUnitOptions } from '@/lib/product-packaging'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'
import type { ProductFormController } from './use-product-form-controller'
import { InlineReading, MeasurementUnitField, ProductSectionHeader } from './product-form-fields'

type ProductStructureSectionProps = Readonly<{
  appearance: 'default' | 'embedded'
  controller: ProductFormController
}>

export function ProductStructureSection({ appearance, controller }: ProductStructureSectionProps) {
  const {
    calculatedStockTotal,
    errors,
    handleMeasurementModeChange,
    manualMeasurementMode,
    measurementMode,
    measurementUnitValue,
    measurementValue,
    register,
    unitsPerPackage,
  } = controller
  const isEmbedded = appearance === 'embedded'

  return (
    <section className={isEmbedded ? 'space-y-5 border-t border-dashed border-[var(--border)] pt-6' : 'space-y-5'}>
      {isEmbedded ? (
        <ProductSectionHeader
          description="A estrutura de medida e embalagem fica num bloco contínuo, com leitura rápida do impacto no estoque."
          eyebrow="Estrutura"
          title="Medidas e embalagem"
        />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <SelectField
          error={manualMeasurementMode ? undefined : errors.measurementUnit?.message}
          hint="Use ml, L, kg, g, unidade ou crie outra medida."
          label="Medida"
          options={measurementUnitOptions}
          value={measurementMode}
          onChange={(event) => handleMeasurementModeChange(event.currentTarget.value)}
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

      <ProductStructureReadout
        calculatedStockTotal={calculatedStockTotal}
        isEmbedded={isEmbedded}
        measurementUnitValue={measurementUnitValue}
        measurementValue={measurementValue}
        unitsPerPackage={unitsPerPackage}
      />

      <MeasurementUnitField
        error={errors.measurementUnit?.message}
        isManual={manualMeasurementMode}
        register={register}
        value={measurementUnitValue}
      />
    </section>
  )
}

function ProductStructureReadout({
  calculatedStockTotal,
  isEmbedded,
  measurementUnitValue,
  measurementValue,
  unitsPerPackage,
}: Readonly<{
  calculatedStockTotal: number
  isEmbedded: boolean
  measurementUnitValue: string
  measurementValue: number
  unitsPerPackage: number
}>) {
  if (isEmbedded) {
    return (
      <div className="grid gap-3 border-t border-dashed border-[var(--border)] pt-4 sm:grid-cols-3">
        <InlineReading label="cada unidade" value={formatMeasurement(measurementValue, measurementUnitValue || 'UN')} />
        <InlineReading label="cada caixa/fardo" value={`${unitsPerPackage} und`} />
        <InlineReading label="estoque calculado" value={`${calculatedStockTotal} und`} />
      </div>
    )
  }

  return (
    <div className="imperial-card-soft px-4 py-4 text-sm text-[var(--text-soft)]">
      <p className="font-medium text-[var(--text-primary)]">Leitura rápida do cadastro</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="imperial-card-stat px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Cada unidade</p>
          <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
            {formatMeasurement(measurementValue, measurementUnitValue || 'UN')}
          </p>
        </div>
        <div className="imperial-card-stat px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Cada caixa/fardo</p>
          <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{unitsPerPackage} und</p>
        </div>
        <div className="imperial-card-stat px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Estoque calculado</p>
          <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{calculatedStockTotal} und</p>
        </div>
      </div>
    </div>
  )
}
