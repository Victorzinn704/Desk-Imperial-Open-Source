import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { isCashSessionRequiredError } from './operations-error-utils'

describe('isCashSessionRequiredError', () => {
  it('reconhece conflitos reais de caixa', () => {
    expect(isCashSessionRequiredError(new ApiError('Abra o caixa do funcionario antes de criar comandas.', 409))).toBe(
      true,
    )
  })

  it('ignora conflitos operacionais que não são de caixa', () => {
    expect(isCashSessionRequiredError(new ApiError('Essa mesa ja possui uma comanda aberta.', 409))).toBe(false)
  })
})
