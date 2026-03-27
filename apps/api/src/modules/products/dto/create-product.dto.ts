import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CurrencyCode } from '@prisma/client'
import { Transform } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

export class CreateProductDto {
  @ApiProperty({ example: 'Produto Alpha' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

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
}
