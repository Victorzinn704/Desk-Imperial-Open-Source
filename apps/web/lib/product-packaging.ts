export const manualPackagingOption = 'OTHER'
export const customMeasurementOption = 'CUSTOM'

export type ProductPackagingPreset = {
  key: string
  label: string
  measurementUnit: string
  measurementValue: number
  unitsPerPackage: number
}

export const productPackagingPresets: ProductPackagingPreset[] = [
  {
    key: 'LITRAO_CAIXA_12_1L',
    label: 'Litrao - Caixa com 12 und de 1L',
    measurementUnit: 'L',
    measurementValue: 1,
    unitsPerPackage: 12,
  },
  {
    key: 'CRACUDA_LITRINHO_CAIXA_23_300ML',
    label: 'Cracuda / Litrinho - Caixa com 23 und de 300ml',
    measurementUnit: 'ML',
    measurementValue: 300,
    unitsPerPackage: 23,
  },
  {
    key: 'LATA_12_350ML',
    label: 'Lata - 12 und de 350ml',
    measurementUnit: 'ML',
    measurementValue: 350,
    unitsPerPackage: 12,
  },
  {
    key: 'LATAO_12_473ML',
    label: 'Latao - 12 und de 473ml',
    measurementUnit: 'ML',
    measurementValue: 473,
    unitsPerPackage: 12,
  },
  {
    key: 'SUPER_LATAO_12_550ML',
    label: 'Super Latao - 12 und de 550ml',
    measurementUnit: 'ML',
    measurementValue: 550,
    unitsPerPackage: 12,
  },
  {
    key: 'GARRAFA_600_24_600ML',
    label: '600 - 24 und de 600ml',
    measurementUnit: 'ML',
    measurementValue: 600,
    unitsPerPackage: 24,
  },
  {
    key: 'FARDO_REFRIGERANTE_2L_6',
    label: 'Fardo Refrigerante 2L - 6 und',
    measurementUnit: 'L',
    measurementValue: 2,
    unitsPerPackage: 6,
  },
]

export const measurementUnitOptions = [
  { label: 'Mililitro (ml)', value: 'ML' },
  { label: 'Litro (L)', value: 'L' },
  { label: 'Grama (g)', value: 'G' },
  { label: 'Quilo (kg)', value: 'KG' },
  { label: 'Unidade (und)', value: 'UN' },
  { label: 'Outra unidade', value: customMeasurementOption },
]

export function findPackagingPresetByLabel(label: string | null | undefined) {
  if (!label) {
    return null
  }

  return productPackagingPresets.find((preset) => preset.label === label) ?? null
}

export function getMeasurementOption(value: string | null | undefined) {
  if (!value) {
    return customMeasurementOption
  }

  const normalized = value.trim().toUpperCase()
  return measurementUnitOptions.some((option) => option.value === normalized) ? normalized : customMeasurementOption
}

export function formatMeasurement(value: number, unit: string) {
  const normalizedUnit = unit.trim()
  const formattedValue = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, '')
  return `${formattedValue}${normalizedUnit.toLowerCase() === 'un' ? ' und' : normalizedUnit.toLowerCase()}`
}
