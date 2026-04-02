import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class ListProductsQueryDto {
  @ApiPropertyOptional({ example: 'alpha' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string

  @ApiPropertyOptional({ example: 'Bebidas' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string

  @ApiPropertyOptional({ example: false })
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean

  @ApiPropertyOptional({ example: 200, description: 'Máximo de produtos retornados (padrão 200, máx 2000)' })
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  limit?: number

  @ApiPropertyOptional({ description: 'Cursor para paginação (id do último produto recebido)' })
  @IsOptional()
  @IsString()
  cursor?: string
}
