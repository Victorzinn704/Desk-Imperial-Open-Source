import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEmail, IsString, Length, Matches } from 'class-validator'

export class VerifyEmailDto {
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
}
