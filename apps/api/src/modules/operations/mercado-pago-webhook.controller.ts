import { Body, Controller, Headers, HttpCode, Post, Query, Req } from '@nestjs/common'
import type { Request } from 'express'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { ComandaTerminalPaymentReconcileService } from './comanda-terminal-payment-reconcile.service'
import { MercadoPagoWebhookRuntime } from './mercado-pago-webhook-runtime.service'

@Controller('operations/webhooks/mercado-pago')
export class MercadoPagoWebhookController {
  constructor(
    private readonly terminalPaymentReconcile: ComandaTerminalPaymentReconcileService,
    private readonly webhookRuntime: MercadoPagoWebhookRuntime,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Body() body: unknown,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('x-signature') signature: string | undefined,
    @Query() query: Record<string, unknown>,
    @Req() request: Request,
  ) {
    const input = {
      body,
      context: extractRequestContext(request),
      query,
      requestId,
      signature,
    }
    this.terminalPaymentReconcile.validateWebhook(input)

    if (this.webhookRuntime.isReady()) {
      const accepted = await this.webhookRuntime.enqueueWebhook({ ...input, receivedAt: new Date().toISOString() })
      return { accepted, received: true }
    }

    void this.terminalPaymentReconcile.handleWebhook(input).catch(() => undefined)
    return { accepted: true, mode: 'inline-fallback', received: true }
  }
}
