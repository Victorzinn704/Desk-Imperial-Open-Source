/* eslint-disable max-lines, max-lines-per-function */

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

type PackagedBeverageVisual = {
  src: string
  alt: string
  source: 'national-beverage-catalog'
}

const PACKAGED_BEVERAGE_SOURCE = 'national_beverage_catalog'

const beverageCatalog: PackagedBeverageCatalogEntry[] = [
  {
    id: 'brahma',
    label: 'BRAHMA',
    aliases: ['brahma', 'brahma chopp', 'brahma duplo malte'],
    colors: { body: '#d3272e', panel: '#fff4eb', accent: '#f4c24e', text: '#8a1419', cap: '#d9dbe2' },
    defaultShape: 'can',
    barcodes: ['7891149105069', '7891991294942'],
  },
  {
    id: 'antarctica',
    label: 'ANTARCTICA',
    aliases: ['antarctica', 'antarctica sub zero'],
    colors: { body: '#e8edf5', panel: '#2f5ea8', accent: '#e65050', text: '#102a52', cap: '#d8dde5' },
    defaultShape: 'can',
    barcodes: ['7891991000826'],
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
  if (!haystack || !looksLikePackagedBeverage(haystack)) {
    return null
  }

  const matched = beverageCatalog.find((entry) =>
    entry.aliases.some((alias) => haystack.includes(normalizeText(alias))),
  )
  return matched ? { entry: matched, matchedBy: 'keywords' } : null
}

export function resolveBrazilianPackagedBeverageVisual(input: PackagedBeverageInput): PackagedBeverageVisual | null {
  const match = resolveBrazilianPackagedBeverageMatch(input)
  if (!match) {
    return null
  }

  const shape = resolvePackageShape(input, match.entry)
  const volumeLabel = resolveVolumeLabel(input)
  const descriptor = resolveDescriptor(input, match.entry)

  return {
    src: buildSvgDataUri({
      shape,
      label: match.entry.label,
      descriptor,
      volumeLabel,
      colors: match.entry.colors,
    }),
    alt: `Packshot de ${input.name}`,
    source: 'national-beverage-catalog',
  }
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

function resolvePackageShape(input: PackagedBeverageInput, entry: PackagedBeverageCatalogEntry) {
  const haystack = normalizeText([input.name, input.packagingClass ?? '', input.quantityLabel ?? ''].join(' '))

  if (haystack.includes('long neck')) {
    return 'longneck'
  }
  if (haystack.includes('litrao') || haystack.includes('1l') || haystack.includes('1000ml')) {
    return 'bottle'
  }
  if (haystack.includes('latao') || haystack.includes('473ml') || haystack.includes('550ml')) {
    return 'tall-can'
  }
  if (haystack.includes('garrafa') || haystack.includes('pet') || haystack.includes('500ml')) {
    return entry.defaultShape === 'carton' ? 'carton' : 'bottle'
  }
  if (entry.defaultShape) {
    return entry.defaultShape
  }
  return 'can'
}

function resolveVolumeLabel(input: PackagedBeverageInput) {
  const haystack = normalizeText([input.name, input.packagingClass ?? '', input.quantityLabel ?? ''].join(' '))
  const inlineMatch = haystack.match(/(\d{2,4})\s?(ml|l)/)
  if (inlineMatch) {
    return `${inlineMatch[1]}${inlineMatch[2].toUpperCase()}`
  }

  const quantity = (input.quantityLabel ?? '').trim()
  if (quantity) {
    return quantity.toUpperCase()
  }

  return ''
}

function resolveDescriptor(input: PackagedBeverageInput, entry: PackagedBeverageCatalogEntry) {
  const normalizedName = normalizeText(input.name)

  if (entry.id === 'guarana-antarctica') {
    return 'Lata'
  }
  if (entry.id === 'coca-cola') {
    return normalizedName.includes('zero') ? 'Zero' : 'Original'
  }
  if (entry.id === 'agua-mineral') {
    return normalizedName.includes('gas') ? 'Com gas' : 'Sem gas'
  }
  if (normalizedName.includes('zero')) {
    return 'Zero'
  }
  if (normalizedName.includes('puro malte')) {
    return 'Puro malte'
  }
  if (normalizedName.includes('duplo malte')) {
    return 'Duplo malte'
  }
  if (normalizedName.includes('latao')) {
    return 'Latao'
  }
  if (normalizedName.includes('long neck')) {
    return 'Long neck'
  }
  if (normalizedName.includes('litrao')) {
    return 'Litrao'
  }
  return 'Brasil'
}

function buildSvgDataUri({
  shape,
  label,
  descriptor,
  volumeLabel,
  colors,
}: Readonly<{
  shape: 'can' | 'tall-can' | 'bottle' | 'longneck' | 'carton'
  label: string
  descriptor: string
  volumeLabel: string
  colors: PackagedBeverageCatalogEntry['colors']
}>) {
  const figure = buildFigure(shape, colors)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="${escapeXml(
      `${label} ${volumeLabel}`.trim(),
    )}">
      <rect width="200" height="200" rx="44" fill="#f7f8fb"/>
      <ellipse cx="100" cy="176" rx="52" ry="10" fill="rgba(14,20,30,0.08)" />
      ${figure}
      <g font-family="Inter, Arial, sans-serif" text-anchor="middle">
        <text x="100" y="105" fill="${colors.text}" font-size="18" font-weight="800" letter-spacing="1.1">${escapeXml(
          label,
        )}</text>
        <text x="100" y="124" fill="${colors.text}" font-size="10" font-weight="600" letter-spacing="1.8">${escapeXml(
          descriptor.toUpperCase(),
        )}</text>
        ${
          volumeLabel
            ? `<text x="100" y="146" fill="${colors.text}" font-size="9" font-weight="700" letter-spacing="2">${escapeXml(
                volumeLabel,
              )}</text>`
            : ''
        }
      </g>
    </svg>
  `.replace(/\s{2,}/g, ' ')

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function buildFigure(
  shape: 'can' | 'tall-can' | 'bottle' | 'longneck' | 'carton',
  colors: PackagedBeverageCatalogEntry['colors'],
) {
  if (shape === 'bottle') {
    return `
      <g>
        <rect x="88" y="26" width="24" height="18" rx="6" fill="${colors.cap ?? colors.accent}" />
        <rect x="82" y="40" width="36" height="28" rx="12" fill="${colors.body}" />
        <rect x="58" y="60" width="84" height="102" rx="32" fill="${colors.body}" />
        <rect x="70" y="88" width="60" height="48" rx="14" fill="${colors.panel}" opacity="0.94" />
        <path d="M72 72 C80 66, 120 66, 128 72" stroke="${colors.accent}" stroke-width="6" fill="none" opacity="0.9" />
      </g>
    `
  }

  if (shape === 'longneck') {
    return `
      <g>
        <rect x="88" y="20" width="24" height="22" rx="6" fill="${colors.cap ?? colors.accent}" />
        <rect x="84" y="38" width="32" height="30" rx="12" fill="${colors.body}" />
        <rect x="66" y="58" width="68" height="108" rx="26" fill="${colors.body}" />
        <rect x="75" y="92" width="50" height="46" rx="12" fill="${colors.panel}" opacity="0.96" />
      </g>
    `
  }

  if (shape === 'carton') {
    return `
      <g>
        <path d="M68 34 H120 L136 52 V158 H64 V46 Z" fill="${colors.body}" />
        <path d="M120 34 V52 H136" fill="${colors.accent}" opacity="0.8" />
        <rect x="74" y="78" width="52" height="54" rx="10" fill="${colors.panel}" opacity="0.96" />
      </g>
    `
  }

  if (shape === 'tall-can') {
    return `
      <g>
        <rect x="62" y="20" width="76" height="148" rx="28" fill="${colors.body}" />
        <ellipse cx="100" cy="28" rx="38" ry="10" fill="${colors.cap ?? '#d7dade'}" />
        <ellipse cx="100" cy="160" rx="38" ry="10" fill="#bfc4cf" opacity="0.72" />
        <rect x="72" y="72" width="56" height="70" rx="14" fill="${colors.panel}" opacity="0.95" />
        <rect x="62" y="42" width="76" height="10" fill="${colors.accent}" opacity="0.82" />
      </g>
    `
  }

  return `
    <g>
      <rect x="64" y="28" width="72" height="136" rx="26" fill="${colors.body}" />
      <ellipse cx="100" cy="36" rx="36" ry="10" fill="${colors.cap ?? '#d7dade'}" />
      <ellipse cx="100" cy="156" rx="36" ry="10" fill="#c5cad3" opacity="0.72" />
      <rect x="74" y="78" width="52" height="58" rx="13" fill="${colors.panel}" opacity="0.96" />
      <rect x="64" y="50" width="72" height="8" fill="${colors.accent}" opacity="0.82" />
    </g>
  `
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

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
