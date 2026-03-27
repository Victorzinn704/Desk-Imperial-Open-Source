import { ApiProperty } from '@nestjs/swagger'
import { KitchenItemStatus } from '@prisma/client'
import { IsEnum } from 'class-validator'

export class UpdateKitchenItemStatusDto {
  @ApiProperty({ enum: ['IN_PREPARATION', 'READY', 'DELIVERED'] })
  @IsEnum(['IN_PREPARATION', 'READY', 'DELIVERED'])
  status!: 'IN_PREPARATION' | 'READY' | 'DELIVERED'
}
