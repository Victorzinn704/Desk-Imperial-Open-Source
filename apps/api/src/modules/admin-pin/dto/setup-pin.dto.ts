import { IsOptional, IsString, Matches } from 'class-validator'

export class SetupPinDto {
  @IsString()
  @Matches(/^\d{4}$/, { message: 'O PIN deve ter exatamente 4 dígitos numéricos.' })
  pin!: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'O PIN atual deve ter exatamente 4 dígitos numéricos.' })
  currentPin?: string
}
