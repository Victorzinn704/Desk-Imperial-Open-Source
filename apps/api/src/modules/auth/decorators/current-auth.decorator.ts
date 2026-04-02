import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { SessionRequest } from '../auth.types'

export const CurrentAuth = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<SessionRequest>()
  return request.auth
})
