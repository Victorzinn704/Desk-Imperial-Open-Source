import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

export class CreateOrderDto {
  @ApiProperty({ example: 'cm8orderproductid' })
  @IsString()
  productId!: string

  @ApiProperty({ example: 3 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  quantity!: number

  @ApiPropertyOptional({ example: 'Cliente Demo' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  customerName?: string

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
}
