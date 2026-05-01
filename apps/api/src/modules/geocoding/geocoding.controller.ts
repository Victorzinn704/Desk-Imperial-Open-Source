import { Body, Controller, NotFoundException, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { SessionGuard } from '../auth/guards/session.guard'
import type { LookupPostalCodeDto } from './dto/lookup-postal-code.dto'
import type { GeocodingService } from './geocoding.service'

@ApiTags('geocoding')
@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @UseGuards(SessionGuard)
  @Post('postal-code/lookup')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async lookupPostalCode(@Body() body: LookupPostalCodeDto) {
    const result = await this.geocodingService.lookupPostalCode(body.postalCode)

    if (!result) {
      throw new NotFoundException('CEP nao encontrado. Confira o numero informado.')
    }

    return result
  }
}
