import { HttpException, HttpStatus } from '@nestjs/common'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { AuthEmailVerificationService } from './auth-email-verification.service'
import { isServiceUnavailable } from './auth-shared.util'

type UnverifiedLoginMessageInput = {
  emailVerificationService: AuthEmailVerificationService
  user: { id: string; email: string; fullName: string }
  context: RequestContext
}

export async function resolveUnverifiedLoginMessage({
  context,
  emailVerificationService,
  user,
}: UnverifiedLoginMessageInput) {
  try {
    const verificationDelivery = await emailVerificationService.sendEmailVerificationCode({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      context,
      trigger: 'login',
    })

    if (verificationDelivery.deliveryMode === 'preview') {
      return 'Seu email ainda nao foi confirmado. O envio de email esta instavel no momento. Tente reenviar o codigo em instantes.'
    }

    return 'Seu email ainda nao foi confirmado. Enviamos um codigo para liberar o primeiro acesso.'
  } catch (error) {
    if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
      return 'Seu email ainda nao foi confirmado. Aguarde alguns minutos antes de solicitar um novo codigo.'
    }

    if (isServiceUnavailable(error)) {
      return 'Seu email ainda nao foi confirmado. A validacao foi aberta, mas o envio do codigo esta indisponivel no momento. Tente reenviar em alguns instantes.'
    }

    throw error
  }
}
