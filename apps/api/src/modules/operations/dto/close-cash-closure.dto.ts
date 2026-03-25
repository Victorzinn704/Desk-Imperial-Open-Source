import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator'

export class CloseCashClosureDto {
  @ApiProperty({ example: 4150.9 })
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  countedCashAmount!: number

  @ApiPropertyOptional({ example: '2026-03-24' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  businessDate?: string

  @ApiPropertyOptional({ example: 'Fechamento geral do dia.' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string

  @ApiPropertyOptional({ example: false })
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  forceClose?: boolean
}
