import type {
  GeocodedLocation,
  GeocodeInput,
  NominatimResult,
  PostalCodeLookupResult,
  ViaCepResult,
} from './geocoding.types'

type NominatimAddress = NonNullable<NominatimResult['address']>
type ResolvedNominatimAddress = Omit<GeocodedLocation, 'label' | 'latitude' | 'longitude' | 'precision'>
type NominatimAddressKey = keyof NominatimAddress

type NominatimFieldRule = Readonly<{
  fallbackKey: keyof GeocodeInput
  sourceKeys: readonly NominatimAddressKey[]
  target: keyof ResolvedNominatimAddress
}>

const EMPTY_NOMINATIM_ADDRESS: NominatimAddress = {}
const NOMINATIM_ADDRESS_RULES: readonly NominatimFieldRule[] = [
  { target: 'streetLine1', sourceKeys: ['road'], fallbackKey: 'streetLine1' },
  { target: 'streetNumber', sourceKeys: ['house_number'], fallbackKey: 'streetNumber' },
  { target: 'district', sourceKeys: ['suburb', 'neighbourhood', 'quarter', 'city_district'], fallbackKey: 'district' },
  { target: 'city', sourceKeys: ['city', 'town', 'village'], fallbackKey: 'city' },
  { target: 'state', sourceKeys: ['state'], fallbackKey: 'state' },
  { target: 'postalCode', sourceKeys: ['postcode'], fallbackKey: 'postalCode' },
  { target: 'country', sourceKeys: ['country'], fallbackKey: 'country' },
]

export function mapNominatimResult(
  result: NominatimResult,
  fallback: GeocodeInput,
  precision: 'city' | 'address',
): GeocodedLocation | null {
  const latitude = Number.parseFloat(result.lat)
  const longitude = Number.parseFloat(result.lon)

  if (!(Number.isFinite(latitude) && Number.isFinite(longitude))) {
    return null
  }

  const address = resolveNominatimAddress({ result, fallback })

  return {
    ...address,
    latitude,
    longitude,
    label: buildLocationLabel(address),
    precision,
  }
}

export function mapViaCepResult(payload: ViaCepResult, normalizedPostalCode: string): PostalCodeLookupResult {
  return {
    postalCode: firstNonEmptyText([payload.cep, formatPostalCode(normalizedPostalCode)]) ?? normalizedPostalCode,
    streetLine1: firstNonEmptyText([payload.logradouro]),
    addressComplement: firstNonEmptyText([payload.complemento]),
    district: firstNonEmptyText([payload.bairro]),
    city: firstNonEmptyText([payload.localidade]),
    state: firstNonEmptyText([payload.uf]),
    stateName: firstNonEmptyText([payload.estado]),
    country: 'Brasil',
    source: 'viacep',
  }
}

function resolveNominatimAddress(params: { result: NominatimResult; fallback: GeocodeInput }) {
  const address = params.result.address ?? EMPTY_NOMINATIM_ADDRESS
  return buildNominatimAddressFromRules({ address, fallback: params.fallback })
}

function buildNominatimAddressFromRules(params: {
  address: NominatimAddress
  fallback: GeocodeInput
}): ResolvedNominatimAddress {
  return Object.fromEntries(
    NOMINATIM_ADDRESS_RULES.map((rule) => [rule.target, resolveNominatimField(params, rule)]),
  ) as ResolvedNominatimAddress
}

function resolveNominatimField(
  params: {
    address: NominatimAddress
    fallback: GeocodeInput
  },
  rule: NominatimFieldRule,
) {
  const sourceValues = rule.sourceKeys.map((key) => params.address[key])
  return resolveAddressText(...sourceValues, params.fallback[rule.fallbackKey])
}

function buildLocationLabel(address: ResolvedNominatimAddress) {
  const streetLabel = buildStreetLabel(address)

  return [streetLabel, address.district, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(', ')
}

function buildStreetLabel(address: ResolvedNominatimAddress) {
  if (!address.streetLine1) {
    return null
  }

  return [address.streetLine1, address.streetNumber].filter(Boolean).join(', ')
}

function firstNonEmptyText(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? null
}

function resolveAddressText(...values: Array<string | null | undefined>) {
  return firstNonEmptyText(values)
}

function formatPostalCode(value: string) {
  return `${value.slice(0, 5)}-${value.slice(5)}`
}
