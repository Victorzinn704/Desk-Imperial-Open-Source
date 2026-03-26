import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import { AssignComandaDto } from './dto/assign-comanda.dto'
import { AddComandaItemDto } from './dto/add-comanda-item.dto'
import { CloseCashClosureDto } from './dto/close-cash-closure.dto'
import { CloseCashSessionDto } from './dto/close-cash-session.dto'
import { CloseComandaDto } from './dto/close-comanda.dto'
import { CreateCashMovementDto } from './dto/create-cash-movement.dto'
import { GetOperationsLiveQueryDto } from './dto/get-operations-live.query'
import { OpenCashSessionDto } from './dto/open-cash-session.dto'
import { OpenComandaDto } from './dto/open-comanda.dto'
import { ReplaceComandaDto } from './dto/replace-comanda.dto'
import { UpdateComandaStatusDto } from './dto/update-comanda-status.dto'
import { OperationsService } from './operations.service'

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
  openCashSession(@CurrentAuth() auth: AuthContext, @Body() body: OpenCashSessionDto, @Req() request: Request) {
    return this.operationsService.openCashSession(auth, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('cash-sessions/:cashSessionId/movements')
  createCashMovement(
    @CurrentAuth() auth: AuthContext,
    @Param('cashSessionId') cashSessionId: string,
    @Body() body: CreateCashMovementDto,
    @Req() request: Request,
  ) {
    return this.operationsService.createCashMovement(auth, cashSessionId, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('cash-sessions/:cashSessionId/close')
  closeCashSession(
    @CurrentAuth() auth: AuthContext,
    @Param('cashSessionId') cashSessionId: string,
    @Body() body: CloseCashSessionDto,
    @Req() request: Request,
  ) {
    return this.operationsService.closeCashSession(auth, cashSessionId, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas')
  openComanda(@CurrentAuth() auth: AuthContext, @Body() body: OpenComandaDto, @Req() request: Request) {
    return this.operationsService.openComanda(auth, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/items')
  addComandaItem(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body() body: AddComandaItemDto,
    @Req() request: Request,
  ) {
    return this.operationsService.addComandaItem(auth, comandaId, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Patch('comandas/:comandaId')
  replaceComanda(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body() body: ReplaceComandaDto,
    @Req() request: Request,
  ) {
    return this.operationsService.replaceComanda(auth, comandaId, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/assign')
  assignComanda(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body() body: AssignComandaDto,
    @Req() request: Request,
  ) {
    return this.operationsService.assignComanda(auth, comandaId, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/status')
  updateComandaStatus(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body() body: UpdateComandaStatusDto,
    @Req() request: Request,
  ) {
    return this.operationsService.updateComandaStatus(auth, comandaId, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('comandas/:comandaId/close')
  closeComanda(
    @CurrentAuth() auth: AuthContext,
    @Param('comandaId') comandaId: string,
    @Body() body: CloseComandaDto,
    @Req() request: Request,
  ) {
    return this.operationsService.closeComanda(auth, comandaId, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('closures/close')
  closeCashClosure(@CurrentAuth() auth: AuthContext, @Body() body: CloseCashClosureDto, @Req() request: Request) {
    return this.operationsService.closeCashClosure(auth, body, extractRequestContext(request))
  }
}
