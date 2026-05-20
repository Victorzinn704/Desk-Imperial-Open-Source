export type NominatimResult = {
  lat: string
  lon: string
  address?: {
    road?: string
    house_number?: string
    suburb?: string
    neighbourhood?: string
    quarter?: string
    city_district?: string
    city?: string
    town?: string
    village?: string
    state?: string
    postcode?: string
    country?: string
  }
}

export type GeocodeInput = {
  streetLine1?: string | null
  streetNumber?: string | null
  district?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
}

export type ViaCepResult = {
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
  estado?: string
  erro?: boolean
}

export type GeocodedLocation = {
  streetLine1: string | null
  streetNumber: string | null
  district: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  latitude: number
  longitude: number
  label: string
  precision: 'city' | 'address'
}

export type PostalCodeLookupResult = {
  postalCode: string
  streetLine1: string | null
  addressComplement: string | null
  district: string | null
  city: string | null
  state: string | null
  stateName: string | null
  country: string
  source: 'viacep'
}
