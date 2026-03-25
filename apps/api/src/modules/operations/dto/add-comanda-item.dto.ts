import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class AddComandaItemDto {
  @ApiPropertyOptional({ example: 'cmabc123product' })
  @IsOptional()
  @IsString()
  productId?: string

  @ApiPropertyOptional({ example: 'Suco natural 500ml' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  productName?: string

  @ApiProperty({ example: 2 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  quantity!: number

  @ApiPropertyOptional({ example: 14.9 })
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : Number(value)))
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number

  @ApiPropertyOptional({ example: 'Sem gelo.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string
}
