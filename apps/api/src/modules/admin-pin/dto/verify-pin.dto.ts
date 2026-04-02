import { IsString, Matches } from 'class-validator'

export class VerifyPinDto {
  @IsString()
  @Matches(/^\d{4}$/, { message: 'O PIN deve ter exatamente 4 dígitos numéricos.' })
  pin!: string
}
