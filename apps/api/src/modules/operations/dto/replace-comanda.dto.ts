import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type, Transform } from 'class-transformer'
import { IsArray, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator'
import { ComandaDraftItemDto } from './comanda-draft-item.dto'

export class ReplaceComandaDto {
  @ApiProperty({ example: 'X' })
  @IsString()
  @MaxLength(40)
  tableLabel!: string

  @ApiPropertyOptional({ example: 'Mesa aniversario' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string

  @ApiPropertyOptional({ example: '12345678900' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  customerDocument?: string

  @ApiPropertyOptional({ example: 4 })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  participantCount?: number

  @ApiPropertyOptional({ example: 'Cliente solicitou servir entrada primeiro.' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string

  @ApiPropertyOptional({ example: 'cmabc123mesa' })
  @IsOptional()
  @IsString()
  mesaId?: string

  @ApiProperty({ type: [ComandaDraftItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComandaDraftItemDto)
  items!: ComandaDraftItemDto[]

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
}
