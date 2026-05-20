import { describe, expect, it } from 'vitest'
import { formatOrderReference } from './order-reference'

describe('formatOrderReference', () => {
  it('gera uma referencia curta, deterministica e alfanumerica', () => {
    const first = formatOrderReference('cmo54wls-test-order-1')
    const second = formatOrderReference('cmo54wls-test-order-1')

    expect(first).toBe(second)
    expect(first).toMatch(/^[0-9A-Z]{6}$/)
  })

  it('reduz colisao visual entre ids parecidos', () => {
    expect(formatOrderReference('cmo54wls')).not.toBe(formatOrderReference('cmo54wlt'))
  })
})
