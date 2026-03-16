import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, Length, Matches } from 'class-validator'

export class VerifyEmailDto {
  @ApiProperty({ example: 'ceo@empresa.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: '482931' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: 'O codigo precisa ter 6 digitos numericos.',
  })
  code!: string
}
