import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional } from 'class-validator'

export class OperationsResponseOptionsDto {
  @ApiPropertyOptional({ example: true, default: true })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined
    }

    if (typeof value === 'boolean') {
      return value
    }

    return String(value).toLowerCase() !== 'false'
  })
  @IsOptional()
  @IsBoolean()
  includeSnapshot?: boolean
}
