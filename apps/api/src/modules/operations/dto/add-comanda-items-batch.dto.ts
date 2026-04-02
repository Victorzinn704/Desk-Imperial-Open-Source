import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator'
import { AddComandaItemDto } from './add-comanda-item.dto'

export class AddComandaItemsBatchDto {
  @ApiProperty({ type: [AddComandaItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AddComandaItemDto)
  items!: AddComandaItemDto[]
}
