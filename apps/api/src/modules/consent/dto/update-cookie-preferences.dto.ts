import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean } from 'class-validator'

export class UpdateCookiePreferencesDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  analytics!: boolean

  @ApiProperty({ example: false })
  @IsBoolean()
  marketing!: boolean
}
