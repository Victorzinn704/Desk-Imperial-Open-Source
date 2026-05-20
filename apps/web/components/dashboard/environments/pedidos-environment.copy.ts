import { lockedPreviewByView } from './pedidos-environment-locked-data'
import { buildPedidosSummaryConfig } from './pedidos-environment-summary'
import type { LockedPedidosPreview, PedidosView } from './pedidos-environment.types'

export function buildLockedPedidosPreview(view: PedidosView): LockedPedidosPreview {
  return lockedPreviewByView[view]
}
export { buildPedidosSummaryConfig }
