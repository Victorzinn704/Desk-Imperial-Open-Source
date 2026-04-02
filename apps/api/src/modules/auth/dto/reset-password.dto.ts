import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator'
import { PASSWORD_MIN_LENGTH, STRONG_PASSWORD_REGEX } from '../../../common/constants/password'

export class ResetPasswordDto {
  @ApiProperty({ example: 'ceo@empresa.com' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  email!: string

  @ApiProperty({ example: '48293174' })
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: 'O codigo precisa ter 6 digitos numericos.',
  })
  code!: string

  @ApiProperty({ example: 'Strong@123' })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(STRONG_PASSWORD_REGEX, {
    message: 'A senha precisa ter letra maiuscula, minuscula, numero e caractere especial.',
  })
  password!: string
}
