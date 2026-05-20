import { Injectable } from '@nestjs/common'
import type { RequestContext } from '../../common/utils/request-context.util'
import {
  type MercadoPagoPointCancelOrderInput,
  MercadoPagoPointClient,
  type MercadoPagoPointCreateOrderInput,
} from './mercado-pago-point.client'
import { MercadoPagoTerminalOrderRuntime } from './mercado-pago-terminal-order-runtime.service'

@Injectable()
export class ComandaTerminalPaymentProviderService {
  constructor(
    private readonly mercadoPagoPoint: MercadoPagoPointClient,
    private readonly terminalOrderRuntime: MercadoPagoTerminalOrderRuntime,
  ) {}

  assertConfigured() {
    this.mercadoPagoPoint.assertConfigured()
  }

  getDefaultTerminalId() {
    return this.mercadoPagoPoint.getDefaultTerminalId()
  }

  createOrder(input: MercadoPagoPointCreateOrderInput) {
    return this.mercadoPagoPoint.createOrder(input)
  }

  cancelOrder(input: MercadoPagoPointCancelOrderInput) {
    return this.mercadoPagoPoint.cancelOrder(input)
  }

  enqueueOrderCreation(job: { context: RequestContext; intentId: string; receivedAt: string }) {
    if (!this.terminalOrderRuntime.isReady()) {
      return false
    }

    return this.terminalOrderRuntime.enqueueTerminalOrder(job)
  }
}
