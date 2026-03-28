import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import type { AssignComandaDto } from './dto/assign-comanda.dto'
import type { AddComandaItemDto } from './dto/add-comanda-item.dto'
import type { CloseCashClosureDto } from './dto/close-cash-closure.dto'
import type { CloseCashSessionDto } from './dto/close-cash-session.dto'
import type { CloseComandaDto } from './dto/close-comanda.dto'
import type { CreateCashMovementDto } from './dto/create-cash-movement.dto'
import type { CreateMesaDto } from './dto/create-mesa.dto'
import type { GetOperationsLiveQueryDto } from './dto/get-operations-live.query'
import type { OpenCashSessionDto } from './dto/open-cash-session.dto'
import type { OpenComandaDto } from './dto/open-comanda.dto'
import type { OperationsResponseOptionsDto } from './dto/operations-response-options.dto'
import type { ReplaceComandaDto } from './dto/replace-comanda.dto'
import type { UpdateComandaStatusDto } from './dto/update-comanda-status.dto'
import type { UpdateKitchenItemStatusDto } from './dto/update-kitchen-item-status.dto'
import type { UpdateMesaDto } from './dto/update-mesa.dto'
import type { OperationsService } from './operations.service'

@ApiTags('operations')
@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @UseGuards(SessionGuard)
  @Get('live')
  getLiveSnapshot(@CurrentAuth() auth: AuthContext, @Query() query: GetOperationsLiveQueryDto) {
    return this.operationsService.getLiveSnapshot(auth, query)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('cash-sessions')
  openCashSession(
    @CurrentAuth() auth: AuthContext,
    @Body() body: OpenCashSessionDto,
    @Query() options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.openCashSession(auth, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('cash-sessions/:cashSessionId/movements')
  createCashMovement(
    @CurrentAuth() auth: AuthContext,
    @Param('cashSessionId') cashSessionId: string,
    @Body() body: CreateCashMovementDto,
    @Query() options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.createCashMovement(auth, cashSessionId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('cash-sessions/:cashSessionId/close')
  closeCashSession(
    @CurrentAuth() auth: AuthContext,
    @Param('cashSessionId') cashSessionId: string,
    @Body() body: CloseCashSessionDto,
    @Query() options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.closeCashSession(auth, cashSessionId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas')
  openComanda(
    @CurrentAuth() auth: AuthContext,
    @Body() body: OpenComandaDto,
    @Query() options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.openComanda(auth, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/items')
  addComandaItem(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body() body: AddComandaItemDto,
    @Query() options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.addComandaItem(auth, comandaId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Patch('comandas/:comandaId')
  replaceComanda(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body() body: ReplaceComandaDto,
    @Query() options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.replaceComanda(auth, comandaId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/assign')
  assignComanda(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body() body: AssignComandaDto,
    @Query() options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.assignComanda(auth, comandaId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/status')
  updateComandaStatus(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body() body: UpdateComandaStatusDto,
    @Query() options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.updateComandaStatus(auth, comandaId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/close')
  closeComanda(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body() body: CloseComandaDto,
    @Query() options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.closeComanda(auth, comandaId, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('closures/close')
  closeCashClosure(
    @CurrentAuth() auth: AuthContext,
    @Body() body: CloseCashClosureDto,
    @Query() options: OperationsResponseOptionsDto,
    @Req() request: Request,
  ) {
    return this.operationsService.closeCashClosure(auth, body, extractRequestContext(request), options)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Patch('kitchen-items/:itemId/status')
  updateKitchenItemStatus(
    @CurrentAuth() auth: AuthContext,
    @Param('itemId') itemId: string,
    @Body() body: UpdateKitchenItemStatusDto,
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
  createMesa(@CurrentAuth() auth: AuthContext, @Body() body: CreateMesaDto, @Req() request: Request) {
    return this.operationsService.createMesa(auth, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Patch('mesas/:mesaId')
  updateMesa(
    @CurrentAuth() auth: AuthContext,
    @Param('mesaId') mesaId: string,
    @Body() body: UpdateMesaDto,
    @Req() request: Request,
  ) {
    return this.operationsService.updateMesa(auth, mesaId, body, extractRequestContext(request))
  }
}
