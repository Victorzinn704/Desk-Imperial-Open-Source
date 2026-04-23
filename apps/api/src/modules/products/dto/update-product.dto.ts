import { ApiPropertyOptional } from '@nestjs/swagger'
import { CurrencyCode } from '@prisma/client'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  Matches,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { ProductComboItemDto } from './product-combo-item.dto'
import { normalizeProductBarcodeInput } from '../products-barcode.util'

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Produto Alpha' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string

  @ApiPropertyOptional({
    example: '7891234567890',
    description: 'EAN/código de barras do produto. Envie vazio/null para remover.',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeProductBarcodeInput(value))
  @IsString()
  @Matches(/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/, {
    message: 'O código de barras precisa ter 8, 12, 13 ou 14 dígitos.',
  })
  barcode?: string | null

  @ApiPropertyOptional({ example: 'Coca-Cola' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string

  @ApiPropertyOptional({ example: 'Bebidas' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category?: string

  @ApiPropertyOptional({ example: 'Lata - 12 und de 350ml' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  packagingClass?: string

  @ApiPropertyOptional({ example: 'ML' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(24)
  measurementUnit?: string

  @ApiPropertyOptional({ example: 350 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  measurementValue?: number

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  unitsPerPackage?: number

  @ApiPropertyOptional({ example: 'Produto atualizado para simulacao de margem.' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string

  @ApiPropertyOptional({ example: '350ml', description: 'Leitura de quantidade vinda do catálogo externo.' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(64)
  quantityLabel?: string | null

  @ApiPropertyOptional({ example: '269ml', description: 'Porção/medida de consumo do catálogo externo.' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(64)
  servingSize?: string | null

  @ApiPropertyOptional({ example: 'https://images.openfoodfacts.org/images/products/789/123/456/7890/front_pt.3.400.jpg' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  imageUrl?: string | null

  @ApiPropertyOptional({ example: 'open_food_facts', description: 'Origem do enriquecimento externo.' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(80)
  catalogSource?: string | null

  @ApiPropertyOptional({ example: true, description: 'Define se este produto funciona como combo.' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isCombo?: boolean

  @ApiPropertyOptional({
    example: 'Combo com lanche + bebida + sobremesa',
    description: 'Descrição do que compõe o combo.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(420)
  comboDescription?: string

  @ApiPropertyOptional({
    type: ProductComboItemDto,
    isArray: true,
    description: 'Componentes do combo com quantidade por caixa e unidade.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductComboItemDto)
  comboItems?: ProductComboItemDto[]

  @ApiPropertyOptional({ example: 18.9 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number

  @ApiPropertyOptional({ example: 39.9 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number

  @ApiPropertyOptional({ enum: CurrencyCode, example: CurrencyCode.USD })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  stock?: number

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  active?: boolean

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  requiresKitchen?: boolean

  @ApiPropertyOptional({
    example: 12,
    description: 'Limite mínimo de unidades para alerta de estoque baixo. Null remove o alerta.',
  })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === '' ? null : Number(value)))
  @IsInt()
  @Min(0)
  lowStockThreshold?: number | null
}
