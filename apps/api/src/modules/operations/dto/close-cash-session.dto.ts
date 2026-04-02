import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CloseCashSessionDto {
  @ApiProperty({ example: 1280.4 })
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  countedCashAmount!: number

  @ApiPropertyOptional({ example: 'Fechamento sem divergencias.' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string
}
