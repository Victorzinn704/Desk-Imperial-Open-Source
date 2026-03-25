import { ApiProperty } from '@nestjs/swagger'
import { ComandaStatus } from '@prisma/client'
import { IsEnum } from 'class-validator'

export class UpdateComandaStatusDto {
  @ApiProperty({ enum: ComandaStatus, example: ComandaStatus.IN_PREPARATION })
  @IsEnum(ComandaStatus)
  status!: ComandaStatus
}
