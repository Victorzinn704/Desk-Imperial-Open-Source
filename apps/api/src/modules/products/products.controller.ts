import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { SessionGuard } from '../auth/guards/session.guard'
import { CreateProductDto } from './dto/create-product.dto'
import { ListProductsQueryDto } from './dto/list-products.query'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductsService } from './products.service'

@ApiTags('products')
@UseGuards(SessionGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  listProducts(@CurrentAuth() auth: AuthContext, @Query() query: ListProductsQueryDto) {
    return this.productsService.listForUser(auth, query)
  }

  @Post()
  createProduct(@CurrentAuth() auth: AuthContext, @Body() body: CreateProductDto, @Req() request: Request) {
    return this.productsService.createForUser(auth, body, extractRequestContext(request))
  }

  @Patch(':productId')
  updateProduct(
    @CurrentAuth() auth: AuthContext,
    @Param('productId') productId: string,
    @Body() body: UpdateProductDto,
    @Req() request: Request,
  ) {
    return this.productsService.updateForUser(auth, productId, body, extractRequestContext(request))
  }

  @Delete(':productId')
  archiveProduct(@CurrentAuth() auth: AuthContext, @Param('productId') productId: string, @Req() request: Request) {
    return this.productsService.archiveForUser(auth, productId, extractRequestContext(request))
  }

  @Post(':productId/restore')
  restoreProduct(@CurrentAuth() auth: AuthContext, @Param('productId') productId: string, @Req() request: Request) {
    return this.productsService.restoreForUser(auth, productId, extractRequestContext(request))
  }
}
