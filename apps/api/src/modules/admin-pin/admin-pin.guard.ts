import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { Request } from 'express'
import type { AuthContext } from '../auth/auth.types'
import { AdminPinService } from './admin-pin.service'

@Injectable()
export class AdminPinGuard implements CanActivate {
  constructor(private readonly adminPinService: AdminPinService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { auth?: AuthContext }>()
    const auth = request.auth

    if (!auth?.userId) {
      throw new ForbiddenException('Sessão inválida.')
    }

    const workspaceOwnerUserId = auth.role === 'OWNER' ? auth.userId : (auth.companyOwnerUserId ?? auth.userId)
    const hasPinConfigured = await this.adminPinService.hasPinConfigured(workspaceOwnerUserId)

    if (!hasPinConfigured) {
      return true
    }

    const proof = this.adminPinService.extractVerificationProof(request)
    const valid = await this.adminPinService.validateVerificationProof(auth, proof)

    if (!valid) {
      throw new ForbiddenException('Validação administrativa ausente, inválida ou expirada.')
    }

    return true
  }
}
