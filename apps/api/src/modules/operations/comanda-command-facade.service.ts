import { Inject, Injectable } from '@nestjs/common'
import { ComandaItemsService } from './comanda-items.service'
import { ComandaKitchenService } from './comanda-kitchen.service'
import { ComandaLifecycleService } from './comanda-lifecycle.service'
import { ComandaOpenService } from './comanda-open.service'
import { ComandaSettlementService } from './comanda-settlement.service'

@Injectable()
export class ComandaCommandFacadeService {
  constructor(
    @Inject(ComandaOpenService) readonly open: ComandaOpenService,
    @Inject(ComandaItemsService) readonly items: ComandaItemsService,
    @Inject(ComandaLifecycleService) readonly lifecycle: ComandaLifecycleService,
    @Inject(ComandaSettlementService) readonly settlement: ComandaSettlementService,
    @Inject(ComandaKitchenService) readonly kitchen: ComandaKitchenService,
  ) {}
}
