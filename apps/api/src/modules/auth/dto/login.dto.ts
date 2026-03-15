import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @ApiProperty({ example: 'ceo@empresa.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'Strong@123' })
  @IsString()
  @MinLength(8)
  password!: string
}
