import { Body, Controller, Delete, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { assertOwnerRole } from '../../common/utils/workspace-access.util'
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
   * Verifica o PIN e emite um challenge opaco.
   * O challenge fica no Redis e a prova valida segue em cookie HttpOnly.
   * Response 200: { valid: true, verifiedUntil: string }
   * Response 401: PIN inválido
   * Response 423: Muitas tentativas
   * Response 404: Nenhum PIN configurado
   */
  @Post('verify-pin')
  @HttpCode(HttpStatus.OK)
  async verifyPin(
    @CurrentAuth() auth: AuthContext,
    @Body() body: VerifyPinDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const challenge = await this.adminPinService.issueVerificationChallenge(auth, body.pin)

    this.adminPinService.setVerificationCookie(response, challenge.challengeId, challenge.expiresAt)

    return { valid: true, verifiedUntil: challenge.expiresAt.toISOString() }
  }

  /**
   * Configura ou altera o PIN.
   * Setup inicial: { pin } sem currentPin.
   * Alteração: { pin, currentPin }.
   */
  @Post('pin')
  @HttpCode(HttpStatus.OK)
  async setupPin(
    @CurrentAuth() auth: AuthContext,
    @Body() body: SetupPinDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertOwnerRole(auth, 'Apenas o dono pode configurar o PIN administrativo.')
    await this.adminPinService.setupPin(auth.userId, body.pin, body.currentPin)
    this.adminPinService.clearVerificationCookie(response)
    return { message: 'PIN configurado com sucesso.' }
  }

  /**
   * Remove o PIN atual — exige confirmação com o PIN corrente.
   */
  @Delete('pin')
  @HttpCode(HttpStatus.OK)
  async removePin(
    @CurrentAuth() auth: AuthContext,
    @Body() body: RemovePinDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertOwnerRole(auth, 'Apenas o dono pode remover o PIN administrativo.')
    await this.adminPinService.removePin(auth.userId, body.pin)
    this.adminPinService.clearVerificationCookie(response)
    return { message: 'PIN removido.' }
  }
}
