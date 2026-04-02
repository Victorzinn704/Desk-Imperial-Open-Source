import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import type { SessionRequest } from '../auth.types'
import { AuthService } from '../auth.service'

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<SessionRequest>()
    const cookieName = this.authService.getSessionCookieName()
    const rawToken = request.cookies?.[cookieName]

    if (!rawToken) {
      throw new UnauthorizedException('Sessao nao encontrada.')
    }

    const authContext = await this.authService.validateSessionToken(rawToken)

    if (!authContext) {
      throw new UnauthorizedException('Sessao invalida ou expirada.')
    }

    request.auth = authContext
    return true
  }
}
