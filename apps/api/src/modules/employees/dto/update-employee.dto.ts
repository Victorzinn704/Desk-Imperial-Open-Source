import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  STRONG_PASSWORD_MESSAGE,
  STRONG_PASSWORD_REGEX,
} from '../../../common/constants/password'

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'VEN-001' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  employeeCode?: string

  @ApiPropertyOptional({ example: 'Vendedor 001' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean

  @ApiPropertyOptional({ example: 'Funcionario@123' })
  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(STRONG_PASSWORD_REGEX, {
    message: STRONG_PASSWORD_MESSAGE,
  })
  temporaryPassword?: string

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salarioBase?: number

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentualVendas?: number
}
