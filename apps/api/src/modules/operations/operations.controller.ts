import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import { OperationsService } from './operations.service'
import {
  addComandaItemBodySchema,
  addComandaItemsBatchBodySchema,
  assignComandaBodySchema,
  closeCashClosureBodySchema,
  closeCashSessionBodySchema,
  closeComandaBodySchema,
  createCashMovementBodySchema,
  createMesaBodySchema,
  openCashSessionBodySchema,
  openComandaBodySchema,
  operationsLiveQuerySchema,
  operationsResponseOptionsSchema,
  replaceComandaBodySchema,
  updateComandaStatusBodySchema,
  updateKitchenItemStatusBodySchema,
  updateMesaBodySchema,
  type AddComandaItemDto,
  type AddComandaItemsBatchDto,
  type AssignComandaDto,
  type CloseCashClosureDto,
  type CloseCashSessionDto,
  type CloseComandaDto,
  type CreateCashMovementDto,
  type CreateMesaDto,
  type GetOperationsLiveQueryDto,
  type OpenCashSessionDto,
  type OpenComandaDto,
  type OperationsResponseOptionsDto,
  type ReplaceComandaDto,
  type UpdateComandaStatusDto,
  type UpdateKitchenItemStatusDto,
  type UpdateMesaDto,
} from './operations.schemas'

const operationsLiveQueryPipe = new ZodValidationPipe(operationsLiveQuerySchema)
const operationsResponseOptionsPipe = new ZodValidationPipe(operationsResponseOptionsSchema)
const openCashSessionBodyPipe = new ZodValidationPipe(openCashSessionBodySchema)
const createCashMovementBodyPipe = new ZodValidationPipe(createCashMovementBodySchema)
const closeCashSessionBodyPipe = new ZodValidationPipe(closeCashSessionBodySchema)
const openComandaBodyPipe = new ZodValidationPipe(openComandaBodySchema)
const addComandaItemBodyPipe = new ZodValidationPipe(addComandaItemBodySchema)
const addComandaItemsBatchBodyPipe = new ZodValidationPipe(addComandaItemsBatchBodySchema)
const replaceComandaBodyPipe = new ZodValidationPipe(replaceComandaBodySchema)
const assignComandaBodyPipe = new ZodValidationPipe(assignComandaBodySchema)
const updateComandaStatusBodyPipe = new ZodValidationPipe(updateComandaStatusBodySchema)
const closeComandaBodyPipe = new ZodValidationPipe(closeComandaBodySchema)
const closeCashClosureBodyPipe = new ZodValidationPipe(closeCashClosureBodySchema)
const updateKitchenItemStatusBodyPipe = new ZodValidationPipe(updateKitchenItemStatusBodySchema)
const createMesaBodyPipe = new ZodValidationPipe(createMesaBodySchema)
const updateMesaBodyPipe = new ZodValidationPipe(updateMesaBodySchema)

@ApiTags('operations')
@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @UseGuards(SessionGuard)
  @Get('live')
  getLiveSnapshot(@CurrentAuth() auth: AuthContext, @Query(operationsLiveQueryPipe) query: GetOperationsLiveQueryDto) {
    return this.operationsService.getLiveSnapshot(auth, query)
  }

  @UseGuards(SessionGuard)
  @Get('kitchen')
  getKitchenView(@CurrentAuth() auth: AuthContext, @Query(operationsLiveQueryPipe) query: GetOperationsLiveQueryDto) {
    return this.operationsService.getKitchenView(auth, query)
  }

  @UseGuards(SessionGuard)
  @Get('summary')
  getSummaryView(@CurrentAuth() auth: AuthContext, @Query(operationsLiveQueryPipe) query: GetOperationsLiveQueryDto) {
    return this.operationsService.getSummaryView(auth, query)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('cash-sessions')
  openCashSession(
    @CurrentAuth() auth: AuthContext,
    @Body(openCashSessionBodyPipe) body: OpenCashSessionDto,
    @Query(operationsResponseOptionsPipe) options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.openCashSession(auth, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('cash-sessions/:cashSessionId/movements')
  createCashMovement(
    @CurrentAuth() auth: AuthContext,
    @Param('cashSessionId') cashSessionId: string,
    @Body(createCashMovementBodyPipe) body: CreateCashMovementDto,
    @Query(operationsResponseOptionsPipe) options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.createCashMovement(auth, cashSessionId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('cash-sessions/:cashSessionId/close')
  closeCashSession(
    @CurrentAuth() auth: AuthContext,
    @Param('cashSessionId') cashSessionId: string,
    @Body(closeCashSessionBodyPipe) body: CloseCashSessionDto,
    @Query(operationsResponseOptionsPipe) options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.closeCashSession(auth, cashSessionId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas')
  openComanda(
    @CurrentAuth() auth: AuthContext,
    @Body(openComandaBodyPipe) body: OpenComandaDto,
    @Query(operationsResponseOptionsPipe) options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.openComanda(auth, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/items')
  addComandaItem(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body(addComandaItemBodyPipe) body: AddComandaItemDto,
    @Query(operationsResponseOptionsPipe) options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.addComandaItem(auth, comandaId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/items/batch')
  addComandaItems(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body(addComandaItemsBatchBodyPipe) body: AddComandaItemsBatchDto,
    @Query(operationsResponseOptionsPipe) options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.addComandaItems(auth, comandaId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Patch('comandas/:comandaId')
  replaceComanda(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body(replaceComandaBodyPipe) body: ReplaceComandaDto,
    @Query(operationsResponseOptionsPipe) options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.replaceComanda(auth, comandaId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/assign')
  assignComanda(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body(assignComandaBodyPipe) body: AssignComandaDto,
    @Query(operationsResponseOptionsPipe) options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.assignComanda(auth, comandaId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/status')
  updateComandaStatus(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body(updateComandaStatusBodyPipe) body: UpdateComandaStatusDto,
    @Query(operationsResponseOptionsPipe) options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.updateComandaStatus(auth, comandaId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard)
  @Get('comandas/:comandaId/details')
  getComandaDetails(@CurrentAuth() auth: AuthContext, @Param('comandaId') comandaId: string) {
    return this.operationsService.getComandaDetails(auth, comandaId)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/close')
  closeComanda(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body(closeComandaBodyPipe) body: CloseComandaDto,
    @Query(operationsResponseOptionsPipe) options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.closeComanda(auth, comandaId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('closures/close')
  closeCashClosure(
    @CurrentAuth() auth: AuthContext,
    @Body(closeCashClosureBodyPipe) body: CloseCashClosureDto,
    @Query(operationsResponseOptionsPipe) options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.closeCashClosure(auth, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Patch('kitchen-items/:itemId/status')
  updateKitchenItemStatus(
    @CurrentAuth() auth: AuthContext,
    @Param('itemId') itemId: string,
    @Body(updateKitchenItemStatusBodyPipe) body: UpdateKitchenItemStatusDto,
    @Req() request: Request,
  ) {
    return this.operationsService.updateKitchenItemStatus(auth, itemId, body, extractRequestContext(request))
  }

  // ── Mesas ──────────────────────────────────────────────────────────────────

  @UseGuards(SessionGuard)
  @Get('mesas')
  listMesas(@CurrentAuth() auth: AuthContext) {
    return this.operationsService.listMesas(auth)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('mesas')
  createMesa(@CurrentAuth() auth: AuthContext, @Body(createMesaBodyPipe) body: CreateMesaDto, @Req() request: Request) {
    return this.operationsService.createMesa(auth, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Patch('mesas/:mesaId')
  updateMesa(
    @CurrentAuth() auth: AuthContext,
    @Param('mesaId') mesaId: string,
    @Body(updateMesaBodyPipe) body: UpdateMesaDto,
    @Req() request: Request,
  ) {
    return this.operationsService.updateMesa(auth, mesaId, body, extractRequestContext(request))
  }
}
