import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CashMovementType } from '@prisma/client'
import { Transform } from 'class-transformer'
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateCashMovementDto {
  @ApiProperty({ enum: CashMovementType, example: CashMovementType.SUPPLY })
  @IsEnum(CashMovementType)
  type!: CashMovementType

  @ApiProperty({ example: 50 })
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number

  @ApiPropertyOptional({ example: 'Reposicao para troco do caixa.' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string
}
