import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import { CreateOrderDto } from './dto/create-order.dto'
import { ListOrdersQueryDto } from './dto/list-orders.query'
import { OrdersService } from './orders.service'

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(SessionGuard)
  @Get()
  listOrders(@CurrentAuth() auth: AuthContext, @Query() query: ListOrdersQueryDto) {
    return this.ordersService.listForUser(auth, query)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post()
  createOrder(
    @CurrentAuth() auth: AuthContext,
    @Body() body: CreateOrderDto,
    @Req() request: Request,
  ) {
    return this.ordersService.createForUser(auth, body, extractRequestContext(request), request)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post(':orderId/cancel')
  cancelOrder(@CurrentAuth() auth: AuthContext, @Param('orderId') orderId: string, @Req() request: Request) {
    return this.ordersService.cancelForUser(auth, orderId, extractRequestContext(request))
  }
}
