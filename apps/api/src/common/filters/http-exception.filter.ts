import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { SentryExceptionCaptured } from '@sentry/nestjs'
import type { Request, Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const requestId = response.getHeader('x-request-id') ?? request.headers['x-request-id'] ?? null

    const isClientError = status >= 400 && status < 500

    if (!isClientError) {
      this.logger.error(
        `[${String(requestId ?? 'no-request-id')}] [${request.method}] ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      )
    }

    let message: string | string[] = 'Erro interno do servidor.'

    if (exception instanceof HttpException) {
      const body = exception.getResponse()
      if (typeof body === 'string') {
        message = body
      } else if (typeof body === 'object' && body !== null) {
        const bodyObj = body as Record<string, unknown>
        if (typeof bodyObj.message === 'string') {
          message = bodyObj.message
        } else if (Array.isArray(bodyObj.message)) {
          message = bodyObj.message as string[]
        }
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId,
    })
  }
}
