import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { BuyerType, CurrencyCode } from '@prisma/client'
import { Transform } from 'class-transformer'
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

export class CreateOrderDto {
  @ApiProperty({ example: 'cm8orderproductid' })
  @IsString()
  productId!: string

  @ApiProperty({ example: 3 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  quantity!: number

  @ApiProperty({ example: 'Cliente Demo' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  customerName!: string

  @ApiProperty({ enum: BuyerType, example: BuyerType.PERSON })
  @IsEnum(BuyerType)
  buyerType!: BuyerType

  @ApiProperty({ example: '12345678909' })
  @IsString()
  @MinLength(11)
  @MaxLength(18)
  buyerDocument!: string

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  buyerDistrict?: string

  @ApiProperty({ example: 'Sao Paulo' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  buyerCity!: string

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  buyerState?: string

  @ApiProperty({ example: 'Brasil' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  buyerCountry!: string

  @ApiPropertyOptional({ example: 'cm8employeeid' })
  @IsOptional()
  @IsString()
  sellerEmployeeId?: string

  @ApiPropertyOptional({ example: 'Marketplace' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  channel?: string

  @ApiPropertyOptional({ example: 'Pedido criado para demonstracao do dashboard.' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  notes?: string

  @ApiPropertyOptional({ example: 42.9 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number

  @ApiPropertyOptional({ enum: CurrencyCode, example: CurrencyCode.USD })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode
}
