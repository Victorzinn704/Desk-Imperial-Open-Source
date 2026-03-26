import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class AssignComandaDto {
  @ApiPropertyOptional({ example: 'cmabc123employee' })
  @IsOptional()
  @IsString()
  employeeId?: string
}
