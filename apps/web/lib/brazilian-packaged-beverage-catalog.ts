type PackagedBeverageInput = {
  name: string
  brand?: string | null
  category?: string | null
  barcode?: string | null
  packagingClass?: string | null
  quantityLabel?: string | null
  catalogSource?: string | null
}

type PackagedBeverageCatalogEntry = {
  id: string
  label: string
  aliases: string[]
  colors: {
    body: string
    panel: string
    accent: string
    text: string
    cap?: string
  }
  defaultShape?: 'can' | 'tall-can' | 'bottle' | 'longneck' | 'carton'
  barcodes?: string[]
}

type PackagedBeverageCatalogMatch = {
  entry: PackagedBeverageCatalogEntry
  matchedBy: 'barcode' | 'keywords'
}

const PACKAGED_BEVERAGE_SOURCE = 'national_beverage_catalog'

const beverageCatalog: PackagedBeverageCatalogEntry[] = [
  {
    id: 'brahma',
    label: 'BRAHMA',
    aliases: ['brahma', 'brahma chopp', 'brahma duplo malte'],
    colors: { body: '#d3272e', panel: '#fff4eb', accent: '#f4c24e', text: '#8a1419', cap: '#d9dbe2' },
    defaultShape: 'can',
  },
  {
    id: 'antarctica',
    label: 'ANTARCTICA',
    aliases: ['antarctica', 'antarctica sub zero'],
    colors: { body: '#e8edf5', panel: '#2f5ea8', accent: '#e65050', text: '#102a52', cap: '#d8dde5' },
    defaultShape: 'can',
  },
  {
    id: 'heineken',
    label: 'HEINEKEN',
    aliases: ['heineken'],
    colors: { body: '#14753d', panel: '#f5f9f2', accent: '#d92d39', text: '#eef7eb', cap: '#d6ded1' },
    defaultShape: 'can',
  },
  {
    id: 'budweiser',
    label: 'BUD',
    aliases: ['budweiser', 'bud'],
    colors: { body: '#c71f2d', panel: '#f7f2ef', accent: '#f0c55d', text: '#fff7ef', cap: '#d9dbe2' },
    defaultShape: 'can',
  },
  {
    id: 'bohemia',
    label: 'BOHEMIA',
    aliases: ['bohemia'],
    colors: { body: '#8d1d24', panel: '#fbf1e8', accent: '#d1a24a', text: '#fff7f1', cap: '#d9dbe2' },
    defaultShape: 'longneck',
  },
  {
    id: 'stella-artois',
    label: 'STELLA',
    aliases: ['stella artois', 'stella'],
    colors: { body: '#f4efe2', panel: '#12365c', accent: '#d4a63c', text: '#162d48', cap: '#d7d9dd' },
    defaultShape: 'can',
  },
  {
    id: 'spaten',
    label: 'SPATEN',
    aliases: ['spaten'],
    colors: { body: '#1f1f21', panel: '#f0efe6', accent: '#c78e2b', text: '#f2efe5', cap: '#d1d3d7' },
    defaultShape: 'can',
  },
  {
    id: 'corona',
    label: 'CORONA',
    aliases: ['corona'],
    colors: { body: '#f6ebbd', panel: '#fefcf2', accent: '#163f7a', text: '#163f7a', cap: '#d0c9ad' },
    defaultShape: 'longneck',
  },
  {
    id: 'original',
    label: 'ORIGINAL',
    aliases: ['original'],
    colors: { body: '#c79c4d', panel: '#f7f1df', accent: '#1e3042', text: '#182734', cap: '#d1b782' },
    defaultShape: 'longneck',
  },
  {
    id: 'amstel',
    label: 'AMSTEL',
    aliases: ['amstel'],
    colors: { body: '#f1efe8', panel: '#d52b2c', accent: '#d4aa52', text: '#172330', cap: '#d5d7db' },
    defaultShape: 'can',
  },
  {
    id: 'skol',
    label: 'SKOL',
    aliases: ['skol'],
    colors: { body: '#f7c61c', panel: '#fff4d0', accent: '#e13129', text: '#a7221d', cap: '#d7d9dd' },
    defaultShape: 'can',
  },
  {
    id: 'chopp',
    label: 'CHOPP',
    aliases: ['chopp'],
    colors: { body: '#bb7a26', panel: '#fff4d8', accent: '#5e3812', text: '#fff8ee', cap: '#efe2c2' },
    defaultShape: 'bottle',
  },
  {
    id: 'ipa-artesanal',
    label: 'IPA',
    aliases: ['ipa', 'cerveja artesanal', 'artesanal ipa'],
    colors: { body: '#d87518', panel: '#fff3dd', accent: '#3f2a17', text: '#fff8ef', cap: '#d9dbe2' },
    defaultShape: 'bottle',
  },
  {
    id: 'cerveja-sem-alcool',
    label: 'SEM ALCOOL',
    aliases: ['cerveja sem alcool', 'cerveja sem álcool', 'sem alcool', 'sem álcool'],
    colors: { body: '#eef1f6', panel: '#1f4b8f', accent: '#70b14a', text: '#173052', cap: '#d7dade' },
    defaultShape: 'can',
  },
  {
    id: 'cerveja-generica',
    label: 'CERVEJA',
    aliases: ['cerveja lata', 'cerveja long neck', 'cerveja garrafa', 'cerveja litrao', 'cerveja litrão'],
    colors: { body: '#c49b39', panel: '#fff5db', accent: '#7f1f1f', text: '#fff8ef', cap: '#d7dade' },
    defaultShape: 'can',
  },
  {
    id: 'coca-cola',
    label: 'COCA-COLA',
    aliases: ['coca cola', 'coca-cola', 'coke'],
    colors: { body: '#d72630', panel: '#fde9eb', accent: '#ffffff', text: '#fff7f8', cap: '#d7dade' },
    defaultShape: 'can',
    barcodes: ['7894900011326', '7894900701326'],
  },
  {
    id: 'guarana-antarctica',
    label: 'GUARANA',
    aliases: ['guarana antarctica', 'guarana antartica', 'guarana'],
    colors: { body: '#2d9a45', panel: '#f0fbf3', accent: '#d72f37', text: '#f4fff7', cap: '#d7dade' },
    defaultShape: 'can',
    barcodes: ['7891991000826'],
  },
  {
    id: 'fanta',
    label: 'FANTA',
    aliases: ['fanta'],
    colors: { body: '#f28c18', panel: '#fff2dd', accent: '#1f5ec8', text: '#fff8ef', cap: '#d7dade' },
    defaultShape: 'can',
  },
  {
    id: 'sprite',
    label: 'SPRITE',
    aliases: ['sprite'],
    colors: { body: '#11834f', panel: '#ebfbf4', accent: '#f3da26', text: '#f3fff8', cap: '#d7dade' },
    defaultShape: 'can',
  },
  {
    id: 'pepsi',
    label: 'PEPSI',
    aliases: ['pepsi'],
    colors: { body: '#13449d', panel: '#eff3fc', accent: '#da312f', text: '#f5f8ff', cap: '#d7dade' },
    defaultShape: 'can',
  },
  {
    id: 'guaravita',
    label: 'GUARAVITA',
    aliases: ['guaravita'],
    colors: { body: '#f4d64c', panel: '#fff9de', accent: '#2c8a43', text: '#205c2d', cap: '#d9ddb2' },
    defaultShape: 'carton',
  },
  {
    id: 'agua-mineral',
    label: 'AGUA',
    aliases: ['agua mineral', 'agua'],
    colors: { body: '#7ac4ff', panel: '#eef8ff', accent: '#1d6fb8', text: '#0d4b8a', cap: '#d6e7f5' },
    defaultShape: 'bottle',
  },
]

export function resolveBrazilianPackagedBeverageMatch(
  input: PackagedBeverageInput,
): PackagedBeverageCatalogMatch | null {
  const normalizedBarcode = normalizeBarcode(input.barcode)
  if (normalizedBarcode) {
    const exact = beverageCatalog.find((entry) => entry.barcodes?.includes(normalizedBarcode))
    if (exact) {
      return { entry: exact, matchedBy: 'barcode' }
    }
  }

  const haystack = normalizeText(
    [input.name, input.brand ?? '', input.category ?? '', input.packagingClass ?? '', input.quantityLabel ?? ''].join(
      ' ',
    ),
  )
  if (!(haystack && looksLikePackagedBeverage(haystack))) {
    return null
  }

  const matched = beverageCatalog.find((entry) =>
    entry.aliases.some((alias) => haystack.includes(normalizeText(alias))),
  )
  return matched ? { entry: matched, matchedBy: 'keywords' } : null
}

export function isNationalPackagedBeverageSource(source: string | null | undefined) {
  return (source ?? '').trim().toLowerCase() === PACKAGED_BEVERAGE_SOURCE
}

export function getNationalPackagedBeverageSource() {
  return PACKAGED_BEVERAGE_SOURCE
}

function looksLikePackagedBeverage(haystack: string) {
  return [
    'cerveja',
    'refrigerante',
    'bebida',
    'agua',
    'guarana',
    'guaravita',
    'cola',
    'lata',
    'litrao',
    'long neck',
    'garrafa',
    'pet',
    'carton',
    'caixinha',
    'tonica',
    'energetico',
    'suco',
  ].some((token) => haystack.includes(token))
}

function normalizeBarcode(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '')
  return digits || null
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
