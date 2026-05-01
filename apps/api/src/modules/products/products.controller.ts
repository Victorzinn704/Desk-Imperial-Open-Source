import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import { CreateProductDto } from './dto/create-product.dto'
import { BulkRestockProductsDto } from './dto/bulk-restock-products.dto'
import { ListProductsQueryDto } from './dto/list-products.query'
import { SmartProductDraftDto } from './dto/smart-product-draft.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductsSmartDraftService } from './products-smart-draft.service'
import { ProductsService } from './products.service'

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productsSmartDraftService: ProductsSmartDraftService,
  ) {}

  @UseGuards(SessionGuard)
  @Get()
  listProducts(@CurrentAuth() auth: AuthContext, @Query() query: ListProductsQueryDto) {
    return this.productsService.listForUser(auth, query)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post()
  createProduct(@CurrentAuth() auth: AuthContext, @Body() body: CreateProductDto, @Req() request: Request) {
    return this.productsService.createForUser(auth, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('smart-draft')
  generateSmartDraft(@CurrentAuth() auth: AuthContext, @Body() body: SmartProductDraftDto, @Req() request: Request) {
    return this.productsSmartDraftService.generateDraft(auth, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  importProducts(
    @CurrentAuth() auth: AuthContext,
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
    @Req() request: Request,
  ) {
    return this.productsService.importForUser(auth, file, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Patch(':productId')
  updateProduct(
    @CurrentAuth() auth: AuthContext,
    @Param('productId') productId: string,
    @Body() body: UpdateProductDto,
    @Req() request: Request,
  ) {
    return this.productsService.updateForUser(auth, productId, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post('restock-bulk')
  bulkRestockProducts(@CurrentAuth() auth: AuthContext, @Body() body: BulkRestockProductsDto, @Req() request: Request) {
    return this.productsService.bulkRestockForUser(auth, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Delete(':productId')
  archiveProduct(@CurrentAuth() auth: AuthContext, @Param('productId') productId: string, @Req() request: Request) {
    return this.productsService.archiveForUser(auth, productId, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Delete(':productId/permanent')
  deleteProduct(@CurrentAuth() auth: AuthContext, @Param('productId') productId: string, @Req() request: Request) {
    return this.productsService.deleteForUser(auth, productId, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post(':productId/restore')
  restoreProduct(@CurrentAuth() auth: AuthContext, @Param('productId') productId: string, @Req() request: Request) {
    return this.productsService.restoreForUser(auth, productId, extractRequestContext(request))
  }
}
