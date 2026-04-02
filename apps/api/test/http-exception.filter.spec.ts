import { HttpException, HttpStatus } from '@nestjs/common'
import type { ArgumentsHost } from '@nestjs/common'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'

describe('HttpExceptionFilter', () => {
  function makeHost(response: any, request: any): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as ArgumentsHost
  }

  function makeResponse(requestId: string | null = null) {
    return {
      getHeader: jest.fn(() => requestId),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
  }

  function makeRequest() {
    return {
      method: 'GET',
      url: '/api/test',
      headers: {} as Record<string, string>,
    }
  }

  it('retorna payload padrao para HttpException com mensagem string', () => {
    const filter = new HttpExceptionFilter()
    const response = makeResponse('req-1')
    const request = makeRequest()
    const host = makeHost(response, request)

    const exception = new HttpException('Erro de validacao', HttpStatus.BAD_REQUEST)

    filter.catch(exception, host)

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Erro de validacao',
        path: '/api/test',
        requestId: 'req-1',
      }),
    )
  })

  it('retorna mensagem array quando body da HttpException contem array em message', () => {
    const filter = new HttpExceptionFilter()
    const response = makeResponse(null)
    const request = makeRequest()
    request.headers['x-request-id'] = 'header-req'
    const host = makeHost(response, request)

    const exception = new HttpException({ message: ['campo obrigatorio', 'formato invalido'] }, HttpStatus.UNPROCESSABLE_ENTITY)

    filter.catch(exception, host)

    expect(response.status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: ['campo obrigatorio', 'formato invalido'],
        requestId: 'header-req',
      }),
    )
  })

  it('retorna 500 e loga erro para excecao nao HTTP', () => {
    const filter = new HttpExceptionFilter()
    const loggerErrorSpy = jest.fn()
    ;(filter as any).logger.error = loggerErrorSpy

    const response = makeResponse(null)
    const request = makeRequest()
    const host = makeHost(response, request)

    const exception = new Error('falha inesperada')

    filter.catch(exception, host)

    expect(loggerErrorSpy).toHaveBeenCalledTimes(1)
    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erro interno do servidor.',
        requestId: null,
      }),
    )
  })
})