import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Validate,
  ValidateIf,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator'

export enum LoginModeDto {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}

@ValidatorConstraint({ name: 'loginPasswordLength', async: false })
class LoginPasswordLengthConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments) {
    if (typeof value !== 'string') {
      return false
    }

    const loginMode = (args.object as LoginDto).loginMode
    const minimumLength = loginMode === LoginModeDto.STAFF ? 6 : 8
    return value.length >= minimumLength
  }

  defaultMessage(args: ValidationArguments) {
    const loginMode = (args.object as LoginDto).loginMode
    return loginMode === LoginModeDto.STAFF
      ? 'PIN do funcionário deve ter no mínimo 6 caracteres'
      : 'Senha da empresa deve ter no mínimo 8 caracteres'
  }
}

export class LoginDto {
  @ApiPropertyOptional({ example: 'ceo@empresa.com' })
  @ValidateIf((value: LoginDto) => value.loginMode !== LoginModeDto.STAFF)
  @IsNotEmpty({ message: 'Email é obrigatório' })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string

  @ApiProperty({ enum: LoginModeDto, default: LoginModeDto.OWNER })
  @IsEnum(LoginModeDto)
  loginMode!: LoginModeDto

  @ApiPropertyOptional({ example: 'ceo@empresa.com' })
  @ValidateIf((value: LoginDto) => value.loginMode === LoginModeDto.STAFF)
  @IsString()
  companyEmail?: string

  @ApiPropertyOptional({ example: 'VD-001' })
  @ValidateIf((value: LoginDto) => value.loginMode === LoginModeDto.STAFF)
  @IsString()
  employeeCode?: string

  @ApiProperty({ example: 'Strong@123' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @IsString({ message: 'Senha deve ser texto' })
  @Validate(LoginPasswordLengthConstraint)
  password!: string
}
