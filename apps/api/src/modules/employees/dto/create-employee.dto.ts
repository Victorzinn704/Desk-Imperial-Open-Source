import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches, MaxLength, MinLength } from 'class-validator'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  STRONG_PASSWORD_MESSAGE,
  STRONG_PASSWORD_REGEX,
} from '../../../common/constants/password'

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

  @ApiProperty({ example: 'Funcionario@123' })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(STRONG_PASSWORD_REGEX, {
    message: STRONG_PASSWORD_MESSAGE,
  })
  temporaryPassword!: string
}
