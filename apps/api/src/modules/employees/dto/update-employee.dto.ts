import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'

const EMPLOYEE_PIN_REGEX = /^\d{6}$/
const EMPLOYEE_PIN_MESSAGE = 'O PIN precisa ter exatamente 6 dígitos numéricos.'

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

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @Matches(EMPLOYEE_PIN_REGEX, { message: EMPLOYEE_PIN_MESSAGE })
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
