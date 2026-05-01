import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
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

export class CreateProductDto {
  @ApiProperty({ example: 'Produto Alpha' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @ApiPropertyOptional({ example: '7891234567890', description: 'EAN/código de barras do produto.' })
  @IsOptional()
  @Transform(({ value }) => normalizeProductBarcodeInput(value) ?? undefined)
  @IsString()
  @Matches(/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/, {
    message: 'O código de barras precisa ter 8, 12, 13 ou 14 dígitos.',
  })
  barcode?: string

  @ApiPropertyOptional({ example: 'Coca-Cola' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string

  @ApiProperty({ example: 'Bebidas' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category!: string

  @ApiProperty({ example: 'Litrao - Caixa com 12 und de 1L' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  packagingClass!: string

  @ApiProperty({ example: 'L' })
  @IsString()
  @MinLength(1)
  @MaxLength(24)
  measurementUnit!: string

  @ApiProperty({ example: 1 })
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  measurementValue!: number

  @ApiProperty({ example: 12 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  unitsPerPackage!: number

  @ApiPropertyOptional({ example: 'Produto base para portfolio e simulacao financeira.' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string

  @ApiPropertyOptional({ example: '350ml', description: 'Leitura bruta de quantidade vinda do catálogo externo.' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MaxLength(64)
  quantityLabel?: string

  @ApiPropertyOptional({ example: '269ml', description: 'Porção/medida de consumo retornada pelo catálogo externo.' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MaxLength(64)
  servingSize?: string

  @ApiPropertyOptional({
    example: 'https://images.openfoodfacts.org/images/products/789/123/456/7890/front_pt.3.400.jpg',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  imageUrl?: string

  @ApiPropertyOptional({ example: 'open_food_facts', description: 'Origem do enriquecimento por catálogo externo.' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MaxLength(80)
  catalogSource?: string

  @ApiPropertyOptional({ example: false, description: 'Define se este produto funciona como combo.' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isCombo?: boolean

  @ApiPropertyOptional({
    example: 'Combo 2 lanches + 2 refrigerantes',
    description: 'Descrição operacional do que compõe o combo.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(420)
  comboDescription?: string

  @ApiPropertyOptional({
    type: ProductComboItemDto,
    isArray: true,
    description: 'Lista de componentes do combo com quantidades por caixa/unidade.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductComboItemDto)
  comboItems?: ProductComboItemDto[]

  @ApiProperty({ example: 18.9 })
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost!: number

  @ApiProperty({ example: 39.9 })
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number

  @ApiProperty({ enum: CurrencyCode, example: CurrencyCode.BRL })
  @IsEnum(CurrencyCode)
  currency!: CurrencyCode

  @ApiProperty({ example: 120 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  stock!: number

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  requiresKitchen?: boolean

  @ApiPropertyOptional({ example: 12, description: 'Limite mínimo de unidades para alerta de estoque baixo.' })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === '' ? null : Number(value)))
  @IsInt()
  @Min(0)
  lowStockThreshold?: number | null
}
