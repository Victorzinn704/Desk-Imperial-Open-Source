import { ApiProperty } from '@nestjs/swagger'
import { Matches } from 'class-validator'

export class LookupPostalCodeDto {
  @ApiProperty({ example: '01001-000' })
  @Matches(/^\d{5}-?\d{3}$/, {
    message: 'Informe um CEP valido.',
  })
  postalCode!: string
}
