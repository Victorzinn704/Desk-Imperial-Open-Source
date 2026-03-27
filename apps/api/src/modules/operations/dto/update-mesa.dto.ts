import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'

export class UpdateMesaDto {
  @ApiPropertyOptional({ example: 'Mesa 5' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string

  @ApiPropertyOptional({ example: 6 })
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number

  @ApiPropertyOptional({ example: 'Varanda' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  section?: string

  @ApiPropertyOptional({ example: 200.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  positionX?: number

  @ApiPropertyOptional({ example: 150.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  positionY?: number

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean

  @ApiPropertyOptional({
    description: 'Reservar a mesa até esta data/hora (ISO 8601). Envie null para liberar a reserva.',
    example: '2026-03-26T22:00:00.000Z',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.reservedUntil !== null)
  @IsDateString()
  reservedUntil?: string | null
}
