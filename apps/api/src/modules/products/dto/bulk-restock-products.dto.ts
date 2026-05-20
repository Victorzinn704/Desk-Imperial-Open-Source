import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsIn, IsInt, IsOptional, Min } from 'class-validator'

export class BulkRestockProductsDto {
  @ApiPropertyOptional({
    enum: ['low_stock', 'all_active'],
    default: 'low_stock',
    description: 'Escopo do reabastecimento em massa.',
  })
  @IsOptional()
  @IsIn(['low_stock', 'all_active'])
  mode?: 'low_stock' | 'all_active'

  @ApiPropertyOptional({
    example: 24,
    default: 24,
    description: 'Estoque mínimo desejado em unidades base.',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  targetStock?: number
}
