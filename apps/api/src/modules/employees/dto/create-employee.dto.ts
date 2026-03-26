import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches, MaxLength, MinLength } from 'class-validator'

const EMPLOYEE_PIN_REGEX = /^\d{6}$/
const EMPLOYEE_PIN_MESSAGE = 'O PIN precisa ter exatamente 6 dígitos numéricos.'

export class CreateEmployeeDto {
  @ApiProperty({ example: 'VEN-001' })
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  employeeCode!: string

  @ApiProperty({ example: 'Vendedor 001' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @Matches(EMPLOYEE_PIN_REGEX, { message: EMPLOYEE_PIN_MESSAGE })
  temporaryPassword!: string
}
