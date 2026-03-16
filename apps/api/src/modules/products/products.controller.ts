import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
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
import type { Request } from 'express'
import { FileInterceptor } from '@nestjs/platform-express'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import { CreateProductDto } from './dto/create-product.dto'
import { ListProductsQueryDto } from './dto/list-products.query'
import { UpdateProductDto } from './dto/update-product.dto'
import { ProductsService } from './products.service'

type UploadedCsvFile = {
  buffer: Buffer
  originalname: string
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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
  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 256 * 1024,
        files: 1,
      },
      fileFilter: (_request, file, callback) => {
        const allowedMimeTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel']
        const isCsvFile =
          allowedMimeTypes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv')

        if (!isCsvFile) {
          callback(new BadRequestException('Envie um arquivo CSV valido.'), false)
          return
        }

        callback(null, true)
      },
    }),
  )
  importProducts(
    @CurrentAuth() auth: AuthContext,
    @UploadedFile() file: UploadedCsvFile | undefined,
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
  @Delete(':productId')
  archiveProduct(@CurrentAuth() auth: AuthContext, @Param('productId') productId: string, @Req() request: Request) {
    return this.productsService.archiveForUser(auth, productId, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post(':productId/restore')
  restoreProduct(@CurrentAuth() auth: AuthContext, @Param('productId') productId: string, @Req() request: Request) {
    return this.productsService.restoreForUser(auth, productId, extractRequestContext(request))
  }
}
