import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsString, MinLength, ValidateIf } from 'class-validator'

export enum LoginModeDto {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}

export class LoginDto {
  @ApiPropertyOptional({ example: 'ceo@empresa.com' })
  @ValidateIf((value: LoginDto) => value.loginMode !== LoginModeDto.STAFF)
  @IsString()
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
  @IsString()
  @MinLength(6)
  password!: string
}
