import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { timingSafeEqual } from 'node:crypto'
import type { SessionRequest } from '../auth.types'
import { AuthService } from '../auth.service'
import { getAllowedOrigins, isAllowedOrigin } from '../../../common/utils/origin.util'

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<SessionRequest>()
    const auth = request.auth

    if (!auth) {
      throw new UnauthorizedException('Sessao nao encontrada.')
    }

    this.assertAllowedOrigin(request)

    const cookieName = this.authService.getCsrfCookieName()
    const cookieToken = request.cookies?.[cookieName]
    const headerToken = this.readHeaderToken(request)
    const expectedToken = this.authService.buildCsrfToken(auth.sessionId)

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('Token CSRF ausente.')
    }

    if (!safeEqual(cookieToken, headerToken) || !safeEqual(cookieToken, expectedToken)) {
      throw new ForbiddenException('Token CSRF invalido.')
    }

    return true
  }

  private assertAllowedOrigin(request: SessionRequest) {
    const allowedOrigins = getAllowedOrigins(this.configService)
    const origin = request.get('origin')
    const referer = request.get('referer')

    if (origin && !isAllowedOrigin(origin, allowedOrigins)) {
      throw new ForbiddenException('Origem nao autorizada.')
    }

    if (!origin && referer && !allowedOrigins.some((allowedOrigin) => referer.startsWith(allowedOrigin))) {
      throw new ForbiddenException('Referer nao autorizado.')
    }
  }

  private readHeaderToken(request: SessionRequest) {
    const rawHeader = request.headers['x-csrf-token']
    return Array.isArray(rawHeader) ? rawHeader[0] : rawHeader
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}
