import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, Length, Matches } from 'class-validator'

export class VerifyEmailDto {
  @ApiProperty({ example: 'ceo@empresa.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: '48293174' })
  @IsString()
  @Length(8, 8)
  @Matches(/^\d{8}$/, {
    message: 'O codigo precisa ter 8 digitos numericos.',
  })
  code!: string
}
