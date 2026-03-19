import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import { AdminPinService } from './admin-pin.service'
import { RemovePinDto } from './dto/remove-pin.dto'
import { SetupPinDto } from './dto/setup-pin.dto'
import { VerifyPinDto } from './dto/verify-pin.dto'

@ApiTags('admin')
@Controller('admin')
@UseGuards(SessionGuard, CsrfGuard)
export class AdminPinController {
  constructor(private readonly adminPinService: AdminPinService) {}

  /**
   * Verifica o PIN e retorna um JWT de curta duração.
   * Response 200: { valid: true, adminPinToken: string }
   * Response 401: PIN inválido
   * Response 423: Muitas tentativas
   * Response 404: Nenhum PIN configurado
   */
  @Post('verify-pin')
  @HttpCode(HttpStatus.OK)
  async verifyPin(@CurrentAuth() auth: AuthContext, @Body() body: VerifyPinDto) {
    const valid = await this.adminPinService.verifyPin(auth.userId, body.pin)

    if (!valid) {
      throw new UnauthorizedException('PIN inválido.')
    }

    const adminPinToken = this.adminPinService.generateAdminPinToken(auth.userId)

    return { valid: true, adminPinToken }
  }

  /**
   * Configura ou altera o PIN.
   * Setup inicial: { pin } sem currentPin.
   * Alteração: { pin, currentPin }.
   */
  @Post('pin')
  @HttpCode(HttpStatus.OK)
  async setupPin(@CurrentAuth() auth: AuthContext, @Body() body: SetupPinDto) {
    await this.adminPinService.setupPin(auth.userId, body.pin, body.currentPin)
    return { message: 'PIN configurado com sucesso.' }
  }

  /**
   * Remove o PIN atual — exige confirmação com o PIN corrente.
   */
  @Delete('pin')
  @HttpCode(HttpStatus.OK)
  async removePin(@CurrentAuth() auth: AuthContext, @Body() body: RemovePinDto) {
    await this.adminPinService.removePin(auth.userId, body.pin)
    return { message: 'PIN removido.' }
  }
}
