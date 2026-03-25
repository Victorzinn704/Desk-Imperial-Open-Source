import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class AssignComandaDto {
  @ApiProperty({ example: 'cmabc123employee' })
  @IsString()
  employeeId!: string
}
