import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsString, MinLength, ValidateIf, IsNotEmpty, IsEmail } from 'class-validator'

export enum LoginModeDto {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
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
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  password!: string
}
