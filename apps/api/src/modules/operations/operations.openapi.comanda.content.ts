import {
  buildAddComandaItemPathDefinition,
  buildAddComandaItemsBatchPathDefinition,
} from './operations.openapi.comanda-items.content'
import {
  buildAssignComandaPathDefinition,
  buildCloseComandaPathDefinition,
  buildComandaDetailsPathDefinition,
  buildOpenComandaPathDefinition,
  buildReplaceComandaPathDefinition,
  buildUpdateComandaStatusPathDefinition,
} from './operations.openapi.comanda-lifecycle.content'
import {
  buildCreateComandaTerminalPaymentIntentPathDefinition,
  buildRegisterComandaPaymentPathDefinition,
} from './operations.openapi.comanda-payment.content'
import { buildOperationsKitchenItemPathDefinition } from './operations.openapi.kitchen-item.content'
import type { OperationsOpenApiRefs } from './operations.openapi.shared'

export function buildOperationsComandaPathDefinitions(refs: OperationsOpenApiRefs) {
  return [
    buildOpenComandaPathDefinition(refs),
    buildAddComandaItemPathDefinition(refs),
    buildAddComandaItemsBatchPathDefinition(refs),
    buildReplaceComandaPathDefinition(refs),
    buildAssignComandaPathDefinition(refs),
    buildUpdateComandaStatusPathDefinition(refs),
    buildComandaDetailsPathDefinition(refs),
    buildRegisterComandaPaymentPathDefinition(refs),
    buildCreateComandaTerminalPaymentIntentPathDefinition(refs),
    buildCloseComandaPathDefinition(refs),
  ] as const
}

export { buildOperationsKitchenItemPathDefinition }
