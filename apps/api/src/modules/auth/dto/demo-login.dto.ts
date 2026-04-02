import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator'
import { LoginModeDto } from './login.dto'

export class DemoLoginDto {
  @ApiProperty({ enum: LoginModeDto, default: LoginModeDto.OWNER })
  @IsEnum(LoginModeDto)
  loginMode!: LoginModeDto

  @ApiPropertyOptional({ example: 'VD-001', description: 'Opcional para modo funcionário.' })
  @ValidateIf((value: DemoLoginDto) => value.loginMode === LoginModeDto.STAFF)
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  employeeCode?: string
}
