import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { STRONG_PASSWORD_REGEX, STRONG_PASSWORD_MESSAGE, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../../../common/constants/password'

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
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(STRONG_PASSWORD_REGEX, {
    message: STRONG_PASSWORD_MESSAGE,
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
