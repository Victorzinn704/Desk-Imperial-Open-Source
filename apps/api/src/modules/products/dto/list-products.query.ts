import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator'

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
}
