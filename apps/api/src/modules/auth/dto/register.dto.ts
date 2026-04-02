import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import {
  STRONG_PASSWORD_REGEX,
  STRONG_PASSWORD_MESSAGE,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '../../../common/constants/password'

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

  @ApiProperty({ example: 'Rua das Palmeiras' })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  companyStreetLine1!: string

  @ApiProperty({ example: '123' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  companyStreetNumber!: string

  @ApiPropertyOptional({ example: 'Sala 4' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyAddressComplement?: string

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyDistrict!: string

  @ApiProperty({ example: 'Sao Paulo' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyCity!: string

  @ApiProperty({ example: 'SP' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyState!: string

  @ApiProperty({ example: '01310-100' })
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, {
    message: 'Informe um CEP valido.',
  })
  companyPostalCode!: string

  @ApiProperty({ example: 'Brasil' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyCountry!: string

  @ApiProperty({ example: false })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  hasEmployees!: boolean

  @ApiProperty({ example: 0 })
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return 0
    }

    return Number(value)
  })
  @IsInt()
  @Min(0)
  @Max(100000)
  employeeCount!: number

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
