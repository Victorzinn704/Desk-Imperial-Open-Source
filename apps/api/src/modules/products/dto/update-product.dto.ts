import { ApiPropertyOptional } from '@nestjs/swagger'
import { CurrencyCode } from '@prisma/client'
import { Transform } from 'class-transformer'
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Produto Alpha' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string

  @ApiPropertyOptional({ example: 'Bebidas' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category?: string

  @ApiPropertyOptional({ example: 'Produto atualizado para simulacao de margem.' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string

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
}
