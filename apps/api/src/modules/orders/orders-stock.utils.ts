import { BadRequestException } from '@nestjs/common'

export function assertRequestedStockAvailability(
  productsById: Map<string, { name: string; stock: number }>,
  requestedStockByProduct: Map<string, number>,
) {
  for (const [productId, requestedQuantity] of requestedStockByProduct.entries()) {
    const product = productsById.get(productId)

    if (!product) {
      continue
    }

    if (product.stock < requestedQuantity) {
      throw new BadRequestException(
        `Estoque insuficiente para ${product.name}. Disponivel: ${product.stock} und. Solicitado: ${requestedQuantity} und.`,
      )
    }
  }
}
