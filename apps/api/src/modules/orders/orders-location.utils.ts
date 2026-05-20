import type { PrismaService } from '../../database/prisma.service'
import type { GeocodingService } from '../geocoding/geocoding.service'

export async function resolveBuyerLocation(
  prisma: PrismaService,
  geocodingService: GeocodingService,
  input: {
    userId: string
    district: string | null
    city: string
    state: string | null
    country: string
  },
) {
  const existingOrder = await prisma.order.findFirst({
    where: {
      userId: input.userId,
      buyerDistrict: input.district,
      buyerCity: input.city,
      buyerState: input.state,
      buyerCountry: input.country,
      buyerLatitude: {
        not: null,
      },
      buyerLongitude: {
        not: null,
      },
    },
    select: {
      buyerDistrict: true,
      buyerCity: true,
      buyerState: true,
      buyerCountry: true,
      buyerLatitude: true,
      buyerLongitude: true,
    },
  })

  if (existingOrder?.buyerLatitude != null && existingOrder?.buyerLongitude != null) {
    return {
      district: existingOrder.buyerDistrict,
      city: existingOrder.buyerCity,
      state: existingOrder.buyerState,
      country: existingOrder.buyerCountry,
      latitude: existingOrder.buyerLatitude,
      longitude: existingOrder.buyerLongitude,
      label: [
        existingOrder.buyerDistrict,
        existingOrder.buyerCity,
        existingOrder.buyerState,
        existingOrder.buyerCountry,
      ]
        .filter(Boolean)
        .join(', '),
    }
  }

  return geocodingService.geocodeCityLocation(input)
}
