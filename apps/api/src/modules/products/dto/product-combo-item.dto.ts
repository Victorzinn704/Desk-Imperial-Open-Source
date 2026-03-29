import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsInt, IsString, Min, MinLength } from 'class-validator'

export class ProductComboItemDto {
  @ApiProperty({ example: 'ckw12abc000123xyz' })
  @IsString()
  @MinLength(1)
  productId!: string

  @ApiProperty({ example: 1, description: 'Quantidade em caixas/fardos do componente dentro do combo.' })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  quantityPackages!: number

  @ApiProperty({ example: 0, description: 'Quantidade avulsa (unidades) do componente dentro do combo.' })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  quantityUnits!: number
}
