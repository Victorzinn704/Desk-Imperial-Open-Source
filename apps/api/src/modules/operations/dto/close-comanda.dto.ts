import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CloseComandaDto {
  @ApiPropertyOptional({ example: 10 })
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : Number(value)))
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number

  @ApiPropertyOptional({ example: 15 })
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : Number(value)))
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  serviceFeeAmount?: number

  @ApiPropertyOptional({ example: 'Cliente pagou em dinheiro.' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string
}
