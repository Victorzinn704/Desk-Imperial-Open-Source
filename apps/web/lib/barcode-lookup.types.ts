export type MeasurementUnit = 'ML' | 'L' | 'G' | 'KG' | 'UN'

export type OpenFoodFactsProduct = {
  brands?: string
  categories?: string
  categories_tags_en?: string[]
  generic_name?: string
  image_front_small_url?: string
  packaging?: string
  packaging_text?: string
  packaging_text_pt?: string
  product_name?: string
  product_name_en?: string
  product_name_pt?: string
  quantity?: string
  serving_size?: string
}

export type OpenFoodFactsResponse = {
  product?: OpenFoodFactsProduct
  status?: number
}

export type EanPicturesResponse = {
  Categoria?: string
  Embalagem?: string
  Marca?: string
  Nome?: string
  QuantidadeEmbalagem?: string
  Status?: string
}

export type Barcode = string & { readonly __barcode: unique symbol }

export type BarcodeLookupRequest = {
  barcode: Barcode
  requestUrl: string
}

export type BarcodeNormalizationInput = {
  value: string | undefined
}

export type BarcodeLookupPayload = {
  barcode: string
  brand: string | null
  category: string | null
  description: string | null
  imageUrl: string | null
  measurementUnit: MeasurementUnit | null
  measurementValue: number | null
  name: string | null
  packagingClass: string | null
  quantityLabel: string | null
  servingSize: string | null
  source: string
}

export type BarcodeLookupResult =
  | { ok: true; payload: BarcodeLookupPayload }
  | { message: string; ok: false; status: 404 | 503 }

export type DescriptionInput = {
  genericName: string | undefined
  productName: string | null
}

export type QuantityExtractionInput = {
  rawQuantity: string | undefined
}

export type TextCandidatesInput = {
  values: Array<string | null | undefined>
}

export type OpenFoodFactsPayloadInput = {
  barcode: Barcode
  product: OpenFoodFactsProduct
}

export type ImageProxyInput = {
  payload: BarcodeLookupPayload
  requestUrl: string
}

export type CategoryExtractionInput = {
  rawCategories: string | undefined
  tagCategories: string[] | undefined
}

export type PackagingInferenceInput = {
  name: string | null
  packagingText: string | null
  quantityLabel: string | null
}
