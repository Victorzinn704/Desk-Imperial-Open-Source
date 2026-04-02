import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class GetMarketInsightBodyDto {
  @ApiPropertyOptional({
    description: 'Foco opcional para a leitura consultiva do Gemini.',
    example: 'Como aumentar a margem dos produtos premium no proximo mes?',
  })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  focus?: string
}
