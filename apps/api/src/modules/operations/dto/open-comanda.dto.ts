import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class OpenComandaDto {
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

  @ApiPropertyOptional({ example: 'cmabc123session' })
  @IsOptional()
  @IsString()
  cashSessionId?: string

  @ApiPropertyOptional({ example: 'cmabc123employee' })
  @IsOptional()
  @IsString()
  employeeId?: string
}
