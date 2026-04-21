import type { CurrencyCode, ProductImportResponse, ProductRecord, ProductsResponse } from '@contracts/contracts'

import { type ApiBody, apiFetch } from './api-core'

export type ProductPayload = {
  name: string
  barcode?: string | null
  brand?: string
  category: string
  packagingClass: string
  measurementUnit: string
  measurementValue: number
  unitsPerPackage: number
  isCombo?: boolean
  comboDescription?: string
  comboItems?: Array<{
    productId: string
    quantityPackages: number
    quantityUnits: number
  }>
  description?: string
  unitCost: number
  unitPrice: number
  currency: CurrencyCode
  stock: number
  lowStockThreshold?: number | null
}

export async function fetchProducts() {
  return apiFetch<ProductsResponse>('/products?includeInactive=true', {
    method: 'GET',
  })
}

export async function createProduct(payload: ProductPayload) {
  return apiFetch<{ product: ProductRecord }>('/products', {
    method: 'POST',
    body: payload as ApiBody,
  })
}

export async function updateProduct(productId: string, payload: Partial<ProductPayload> & { active?: boolean }) {
  return apiFetch<{ product: ProductRecord }>(`/products/${productId}`, {
    method: 'PATCH',
    body: payload as ApiBody,
  })
}

export async function archiveProduct(productId: string) {
  return apiFetch<{ product: ProductRecord }>(`/products/${productId}`, {
    method: 'DELETE',
  })
}

export async function restoreProduct(productId: string) {
  return apiFetch<{ product: ProductRecord }>(`/products/${productId}/restore`, {
    method: 'POST',
  })
}

export async function deleteProductPermanently(productId: string) {
  return apiFetch<{ success: boolean; deletedProductId: string }>(`/products/${productId}/permanent`, {
    method: 'DELETE',
  })
}

export async function importProducts(file: File) {
  const formData = new FormData()
  formData.set('file', file)

  return apiFetch<ProductImportResponse>('/products/import', {
    method: 'POST',
    body: formData,
  })
}
