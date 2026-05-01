import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import { normalizeProductBarcodeInput } from '../products-barcode.util'

export class SmartProductDraftDto {
  @ApiPropertyOptional({ example: '7891234567890' })
  @IsOptional()
  @Transform(({ value }) => normalizeProductBarcodeInput(value) ?? undefined)
  @IsString()
  @Matches(/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/, {
    message: 'O código de barras precisa ter 8, 12, 13 ou 14 dígitos.',
  })
  barcode?: string

  @ApiPropertyOptional({ example: 'Heineken 350ml' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string

  @ApiPropertyOptional({ example: 'Heineken' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string

  @ApiPropertyOptional({ example: 'Cervejas' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string

  @ApiPropertyOptional({ example: 'Lata 350ml' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  packagingClass?: string

  @ApiPropertyOptional({ example: 'ML' })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  measurementUnit?: string

  @ApiPropertyOptional({ example: 350 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  measurementValue?: number

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  unitsPerPackage?: number

  @ApiPropertyOptional({ example: '350ml' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MaxLength(64)
  quantityLabel?: string

  @ApiPropertyOptional({ example: '269ml' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MaxLength(64)
  servingSize?: string

  @ApiPropertyOptional({ example: 'Cerveja lager puro malte em lata.' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MaxLength(280)
  description?: string

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  requiresKitchen?: boolean
}
