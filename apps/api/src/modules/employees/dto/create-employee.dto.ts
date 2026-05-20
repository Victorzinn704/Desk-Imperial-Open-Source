import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Vendedor 001' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string
}
