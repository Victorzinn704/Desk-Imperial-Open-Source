import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
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
    if (loginMode === LoginModeDto.STAFF) {
      return /^\d{8}$/.test(value)
    }

    return value.length >= 8
  }

  defaultMessage(args: ValidationArguments) {
    const loginMode = (args.object as LoginDto).loginMode
    return loginMode === LoginModeDto.STAFF
      ? 'A senha do funcionário deve ter exatamente 8 dígitos numéricos'
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
  @IsNotEmpty({ message: 'Email da empresa é obrigatório' })
  @IsEmail({}, { message: 'Email da empresa inválido' })
  companyEmail?: string

  @ApiPropertyOptional({ example: 'VD-001' })
  @ValidateIf((value: LoginDto) => value.loginMode === LoginModeDto.STAFF)
  @IsNotEmpty({ message: 'Código do funcionário é obrigatório' })
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, {
    message: 'Código do funcionário inválido',
  })
  employeeCode?: string

  @ApiProperty({ example: 'Strong@123' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @IsString({ message: 'Senha deve ser texto' })
  @Validate(LoginPasswordLengthConstraint)
  password!: string
}
