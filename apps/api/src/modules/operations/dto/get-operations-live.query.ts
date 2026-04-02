import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, Matches } from 'class-validator'

export class GetOperationsLiveQueryDto {
  @ApiPropertyOptional({
    example: '2026-03-24',
    description: 'Data operacional no formato YYYY-MM-DD. Quando omitida, usa o dia atual do servidor.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  businessDate?: string

  @ApiPropertyOptional({
    example: true,
    description:
      'Quando falso, retorna o snapshot operacional sem o histórico detalhado de movimentos de caixa para reduzir payload em telas ao vivo.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined
    }

    if (typeof value === 'boolean') {
      return value
    }

    const normalized = String(value).trim().toLowerCase()
    if (normalized === 'true') {
      return true
    }

    if (normalized === 'false') {
      return false
    }

    return value
  })
  @IsBoolean()
  includeCashMovements?: boolean

  @ApiPropertyOptional({
    example: true,
    description: 'Quando true, a API omite itens das comandas do payload de snapshot para reduzir absurdamente o tamanho da resposta (lazy-loading).',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value === 'boolean') return value
    const normalized = String(value).trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
    return value
  })
  @IsBoolean()
  compactMode?: boolean

  @ApiPropertyOptional({
    example: false,
    description:
      'Quando false, o snapshot carrega apenas comandas abertas/em preparo/prontas, sem arrastar comandas fechadas para telas operacionais quentes.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value === 'boolean') return value
    const normalized = String(value).trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
    return value
  })
  @IsBoolean()
  includeClosed?: boolean
}
