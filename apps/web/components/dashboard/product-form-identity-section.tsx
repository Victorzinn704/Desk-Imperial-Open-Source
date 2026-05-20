import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'
import type { ProductFormController } from './use-product-form-controller'
import { PackagingClassField, ProductSectionHeader } from './product-form-fields'

type ProductIdentitySectionProps = Readonly<{
  appearance: 'default' | 'embedded'
  controller: ProductFormController
}>

export function ProductIdentitySection({ appearance, controller }: ProductIdentitySectionProps) {
  const {
    errors,
    handlePresetChange,
    packagingClassValue,
    packagingPresetOptions,
    register,
    selectedPreset,
    selectedPresetIsManual,
  } = controller
  const isEmbedded = appearance === 'embedded'

  return (
    <section className="space-y-5">
      {isEmbedded ? (
        <ProductSectionHeader
          description="Nome, categoria e classe de cadastro entram primeiro, sem abrir blocos visuais desnecessários."
          eyebrow="Identidade"
          title="Base do produto"
        />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField error={errors.name?.message} label="Nome" placeholder="Produto Alpha" {...register('name')} />
        <InputField
          error={errors.brand?.message}
          label="Marca"
          placeholder="Coca-Cola, Brahma, Guarana..."
          {...register('brand')}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField
          error={errors.barcode?.message}
          hint="Aceita EAN com 8, 12, 13 ou 14 dígitos."
          inputMode="numeric"
          label="Código de barras"
          placeholder="7891234567890"
          {...register('barcode')}
        />
        <InputField
          error={errors.category?.message}
          label="Categoria"
          placeholder="Bebidas"
          {...register('category')}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          error={!selectedPresetIsManual ? errors.packagingClass?.message : undefined}
          hint="Escolha um perfil pronto ou use Outro para criar um formato próprio."
          label="Classe de cadastro"
          options={packagingPresetOptions}
          value={selectedPreset}
          onChange={(event) => handlePresetChange(event.currentTarget.value)}
        />
      </div>

      <PackagingClassField
        appearance={appearance}
        error={errors.packagingClass?.message}
        isManual={selectedPresetIsManual}
        register={register}
        value={packagingClassValue}
      />
    </section>
  )
}
