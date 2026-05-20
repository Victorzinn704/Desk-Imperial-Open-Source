import { Inject, Injectable } from '@nestjs/common'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { AuthContext } from '../auth/auth.types'
import { ComandaCommandFacadeService } from './comanda-command-facade.service'
import { ComandaQueryService } from './comanda-query.service'
import type {
  AddComandaItemDto,
  AddComandaItemsBatchDto,
  AssignComandaDto,
  CloseComandaDto,
  CreateComandaPaymentDto,
  OpenComandaDto,
  OperationsResponseOptionsDto,
  ReplaceComandaDto,
  UpdateComandaStatusDto,
  UpdateKitchenItemStatusDto,
} from './operations.schemas'

type GetComandaDetailsArgs = [auth: AuthContext, comandaId: string]
type OpenComandaArgs = [
  auth: AuthContext,
  dto: OpenComandaDto,
  context: RequestContext,
  options?: OperationsResponseOptionsDto,
]
type AddComandaItemArgs = [
  auth: AuthContext,
  comandaId: string,
  dto: AddComandaItemDto,
  context: RequestContext,
  options?: OperationsResponseOptionsDto,
]
type AddComandaItemsArgs = [
  auth: AuthContext,
  comandaId: string,
  dto: AddComandaItemsBatchDto,
  context: RequestContext,
  options?: OperationsResponseOptionsDto,
]
type ReplaceComandaArgs = [
  auth: AuthContext,
  comandaId: string,
  dto: ReplaceComandaDto,
  context: RequestContext,
  options?: OperationsResponseOptionsDto,
]
type AssignComandaArgs = [
  auth: AuthContext,
  comandaId: string,
  dto: AssignComandaDto,
  context: RequestContext,
  options?: OperationsResponseOptionsDto,
]
type UpdateComandaStatusArgs = [
  auth: AuthContext,
  comandaId: string,
  dto: UpdateComandaStatusDto,
  context: RequestContext,
  options?: OperationsResponseOptionsDto,
]
type CreateComandaPaymentArgs = [
  auth: AuthContext,
  comandaId: string,
  dto: CreateComandaPaymentDto,
  context: RequestContext,
  options?: OperationsResponseOptionsDto,
]
type CloseComandaArgs = [
  auth: AuthContext,
  comandaId: string,
  dto: CloseComandaDto,
  context: RequestContext,
  options?: OperationsResponseOptionsDto,
]
type UpdateKitchenItemStatusArgs = [
  auth: AuthContext,
  itemId: string,
  dto: UpdateKitchenItemStatusDto,
  context: RequestContext,
]

@Injectable()
export class ComandaService {
  constructor(
    @Inject(ComandaQueryService) private readonly query: ComandaQueryService,
    @Inject(ComandaCommandFacadeService) private readonly commands: ComandaCommandFacadeService,
  ) {}

  getComandaDetails(...args: GetComandaDetailsArgs) {
    const [auth, comandaId] = args
    return this.query.getComandaDetails(auth, comandaId)
  }

  openComanda(...args: OpenComandaArgs) {
    const [auth, dto, context, options] = args
    return this.commands.open.openComanda(auth, dto, context, options)
  }

  addComandaItem(...args: AddComandaItemArgs) {
    const [auth, comandaId, dto, context, options] = args
    return this.commands.items.addComandaItem({ auth, comandaId, dto, context, options })
  }

  addComandaItems(...args: AddComandaItemsArgs) {
    const [auth, comandaId, dto, context, options] = args
    return this.commands.items.addComandaItems({ auth, comandaId, dto, context, options })
  }

  replaceComanda(...args: ReplaceComandaArgs) {
    const [auth, comandaId, dto, context, options] = args
    return this.commands.items.replaceComanda({ auth, comandaId, dto, context, options })
  }

  assignComanda(...args: AssignComandaArgs) {
    const [auth, comandaId, dto, context, options] = args
    return this.commands.lifecycle.assignComanda(auth, comandaId, dto, context, options)
  }

  updateComandaStatus(...args: UpdateComandaStatusArgs) {
    const [auth, comandaId, dto, context, options] = args
    return this.commands.lifecycle.updateComandaStatus(auth, comandaId, dto, context, options)
  }

  createComandaPayment(...args: CreateComandaPaymentArgs) {
    const [auth, comandaId, dto, context, options] = args
    return this.commands.settlement.createComandaPayment({ auth, comandaId, dto, context, options })
  }

  closeComanda(...args: CloseComandaArgs) {
    const [auth, comandaId, dto, context, options] = args
    return this.commands.settlement.closeComanda({ auth, comandaId, dto, context, options })
  }

  updateKitchenItemStatus(...args: UpdateKitchenItemStatusArgs) {
    const [auth, itemId, dto, context] = args
    return this.commands.kitchen.updateKitchenItemStatus({ auth, itemId, dto, context })
  }
}
