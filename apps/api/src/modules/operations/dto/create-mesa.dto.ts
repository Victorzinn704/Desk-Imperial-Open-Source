import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateMesaDto {
  @ApiProperty({ example: 'Mesa 5' })
  @IsString()
  @MaxLength(40)
  label!: string

  @ApiPropertyOptional({ example: 4 })
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number

  @ApiPropertyOptional({ example: 'Salão principal' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  section?: string

  @ApiPropertyOptional({ example: 120.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  positionX?: number

  @ApiPropertyOptional({ example: 80.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  positionY?: number
}
