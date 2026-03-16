import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'VEN-001' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  employeeCode?: string

  @ApiPropertyOptional({ example: 'Vendedor 001' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean
}
