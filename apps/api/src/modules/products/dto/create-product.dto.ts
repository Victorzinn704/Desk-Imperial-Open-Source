import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

export class CreateProductDto {
  @ApiProperty({ example: 'Produto Alpha' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @ApiProperty({ example: 'Bebidas' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category!: string

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

  @ApiProperty({ example: 120 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  stock!: number
}
