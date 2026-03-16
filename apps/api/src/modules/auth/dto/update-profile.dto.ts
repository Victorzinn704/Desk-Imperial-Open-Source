import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CurrencyCode } from '@prisma/client'
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateProfileDto {
  @ApiProperty({ example: 'Joao Vitor' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName!: string

  @ApiPropertyOptional({ example: 'Bar do Pedrao' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string

  @ApiProperty({ enum: CurrencyCode, example: CurrencyCode.BRL })
  @IsEnum(CurrencyCode)
  preferredCurrency!: CurrencyCode
}
