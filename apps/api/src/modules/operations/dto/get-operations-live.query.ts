import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, Matches } from 'class-validator'

export class GetOperationsLiveQueryDto {
  @ApiPropertyOptional({
    example: '2026-03-24',
    description: 'Data operacional no formato YYYY-MM-DD. Quando omitida, usa o dia atual do servidor.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  businessDate?: string
}
