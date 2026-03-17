import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class RegisterDto {
  @ApiProperty({ example: 'Lucia Helena' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName!: string

  @ApiPropertyOptional({ example: 'Bar da Lucia Helena' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string

  @ApiProperty({ example: 'ceo@empresa.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'Strong@Pass123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: 'A senha precisa ter letra maiúscula, minúscula, número e caractere especial.',
  })
  password!: string

  @ApiProperty({ example: true })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  acceptTerms!: boolean

  @ApiProperty({ example: true })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  acceptPrivacy!: boolean

  @ApiPropertyOptional({ example: false })
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  analyticsCookies?: boolean

  @ApiPropertyOptional({ example: false })
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  marketingCookies?: boolean
}
