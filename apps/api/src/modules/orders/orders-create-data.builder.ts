import { type BuyerType, type CurrencyCode, OrderStatus } from '@prisma/client'

type OrderCreationDraft = {
  workspaceUserId: string
  customerName: string
  dto: {
    buyerType: BuyerType
  }
  buyerDocument: string
  buyerDistrict: string | null
  buyerCity: string
  buyerState: string | null
  buyerCountry: string
  geocodedLocation: {
    district: string | null
    city: string | null
    state: string | null
    country: string | null
    latitude: number | null
    longitude: number | null
  } | null
  seller: {
    id: string
    employeeCode: string | null
    displayName: string
  } | null
  channel: string | null
  notes: string | null
  orderCurrency: CurrencyCode
  totals: {
    totalRevenue: number
    totalCost: number
    totalProfit: number
    totalItems: number
  }
  preparedItems: Array<{
    product: {
      id: string
      name: string
      category: string
    }
    quantity: number
    unitCost: number
    unitPrice: number
    lineRevenue: number
    lineCost: number
    lineProfit: number
  }>
}

type GeocodedLocation = NonNullable<OrderCreationDraft['geocodedLocation']>
type LocationTextKey = 'district' | 'city' | 'state' | 'country'
type LocationCoordinateKey = 'latitude' | 'longitude'
type OrderSeller = NonNullable<OrderCreationDraft['seller']>
type SellerKey = 'id' | 'employeeCode' | 'displayName'

export function buildOrderCreateData(draft: OrderCreationDraft) {
  return {
    userId: draft.workspaceUserId,
    customerName: draft.customerName,
    buyerType: draft.dto.buyerType,
    buyerDocument: draft.buyerDocument,
    ...buildBuyerLocationData(draft),
    ...buildSellerData(draft),
    channel: draft.channel,
    notes: draft.notes,
    currency: draft.orderCurrency,
    status: OrderStatus.COMPLETED,
    totalRevenue: draft.totals.totalRevenue,
    totalCost: draft.totals.totalCost,
    totalProfit: draft.totals.totalProfit,
    totalItems: draft.totals.totalItems,
    items: buildOrderItemsData(draft),
  }
}

function buildBuyerLocationData(draft: OrderCreationDraft) {
  return {
    buyerDistrict: resolveLocationText(draft.geocodedLocation, 'district', draft.buyerDistrict),
    buyerCity: resolveLocationText(draft.geocodedLocation, 'city', draft.buyerCity),
    buyerState: resolveLocationText(draft.geocodedLocation, 'state', draft.buyerState),
    buyerCountry: resolveLocationText(draft.geocodedLocation, 'country', draft.buyerCountry),
    buyerLatitude: resolveLocationCoordinate(draft.geocodedLocation, 'latitude'),
    buyerLongitude: resolveLocationCoordinate(draft.geocodedLocation, 'longitude'),
  }
}

function buildSellerData(draft: OrderCreationDraft) {
  return {
    employeeId: resolveSellerValue(draft.seller, 'id'),
    sellerCode: resolveSellerValue(draft.seller, 'employeeCode'),
    sellerName: resolveSellerValue(draft.seller, 'displayName'),
  }
}

function buildOrderItemsData(draft: OrderCreationDraft) {
  return {
    create: draft.preparedItems.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      category: item.product.category,
      quantity: item.quantity,
      currency: draft.orderCurrency,
      unitCost: item.unitCost,
      unitPrice: item.unitPrice,
      lineRevenue: item.lineRevenue,
      lineCost: item.lineCost,
      lineProfit: item.lineProfit,
    })),
  }
}

function resolveLocationText(
  location: GeocodedLocation | null | undefined,
  key: LocationTextKey,
  fallback: string | null,
) {
  return location ? (location[key] ?? fallback) : fallback
}

function resolveLocationCoordinate(location: GeocodedLocation | null | undefined, key: LocationCoordinateKey) {
  return location ? (location[key] ?? null) : null
}

function resolveSellerValue(seller: OrderSeller | null | undefined, key: SellerKey) {
  return seller ? seller[key] : null
}
