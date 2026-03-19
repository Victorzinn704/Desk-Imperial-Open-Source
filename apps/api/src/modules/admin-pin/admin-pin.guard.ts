import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { Request } from 'express'
import type { AuthContext } from '../auth/auth.types'
import { AdminPinService } from './admin-pin.service'

@Injectable()
export class AdminPinGuard implements CanActivate {
  constructor(private readonly adminPinService: AdminPinService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { auth?: AuthContext }>()
    const userId = request.auth?.userId

    if (!userId) {
      throw new ForbiddenException('Sessão inválida.')
    }

    const token = this.extractToken(request)

    // Se o usuário não tem PIN configurado, a ação não precisa de token
    if (!token) {
      const hasPinConfigured = await this.adminPinService.hasPinConfigured(userId)
      if (!hasPinConfigured) return true
      throw new ForbiddenException('Token de Admin PIN ausente.')
    }

    const tokenUserId = this.adminPinService.validateAdminPinToken(token)

    if (!tokenUserId) {
      throw new ForbiddenException('Token de Admin PIN inválido ou expirado.')
    }

    // Garante que o token pertence ao usuário da sessão atual
    if (userId !== tokenUserId) {
      throw new ForbiddenException('Token de Admin PIN não pertence à sessão atual.')
    }

    return true
  }

  private extractToken(request: Request): string | null {
    const header = request.headers['x-admin-pin-token']
    if (typeof header === 'string' && header.length > 0) return header
    if (Array.isArray(header) && header.length > 0) return header[0]
    return null
  }
}
