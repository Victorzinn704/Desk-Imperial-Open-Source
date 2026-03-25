import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator'

export class OpenCashSessionDto {
  @ApiProperty({ example: 250 })
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingCashAmount!: number

  @ApiPropertyOptional({ example: '2026-03-24' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  businessDate?: string

  @ApiPropertyOptional({ example: 'Abertura do caixa principal do turno da noite.' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string
}
