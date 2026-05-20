import { describe, expect, it } from 'vitest'
import {
  getNationalPackagedBeverageSource,
  isNationalPackagedBeverageSource,
  resolveBrazilianPackagedBeverageMatch,
} from './brazilian-packaged-beverage-catalog'

// ── resolveBrazilianPackagedBeverageMatch ─────────────────────────────────────

describe('resolveBrazilianPackagedBeverageMatch', () => {
  it('resolve por barcode exato (Coca-Cola)', () => {
    const match = resolveBrazilianPackagedBeverageMatch({
      name: 'Produto desconhecido',
      barcode: '7894900011326',
    })
    expect(match?.entry.id).toBe('coca-cola')
    expect(match?.matchedBy).toBe('barcode')
  })

  it('resolve por barcode exato (Guaraná Antarctica)', () => {
    const match = resolveBrazilianPackagedBeverageMatch({
      name: 'Produto',
      barcode: '7891991000826',
    })
    expect(match?.entry.id).toBe('guarana-antarctica')
    expect(match?.matchedBy).toBe('barcode')
  })

  it('resolve por keyword para Heineken', () => {
    const match = resolveBrazilianPackagedBeverageMatch({ name: 'Heineken Lata 350ml' })
    expect(match?.entry.id).toBe('heineken')
    expect(match?.matchedBy).toBe('keywords')
  })

  it('resolve por keyword para Bohemia (nome de marca com diacrítico)', () => {
    const match = resolveBrazilianPackagedBeverageMatch({ name: 'Bohemia Long Neck' })
    expect(match?.entry.id).toBe('bohemia')
  })

  it('retorna null para produto de alimentação não-bebida', () => {
    const match = resolveBrazilianPackagedBeverageMatch({ name: 'Pão de queijo assado' })
    expect(match).toBeNull()
  })

  it('barcode tem prioridade sobre keywords quando ambos batem', () => {
    const match = resolveBrazilianPackagedBeverageMatch({
      name: 'Guaraná Antarctica 350ml',
      barcode: '7894900011326', // barcode da Coca-Cola
    })
    expect(match?.entry.id).toBe('coca-cola')
    expect(match?.matchedBy).toBe('barcode')
  })
})

// ── helpers ───────────────────────────────────────────────────────────────────

describe('isNationalPackagedBeverageSource / getNationalPackagedBeverageSource', () => {
  it('identifica a fonte corretamente', () => {
    expect(isNationalPackagedBeverageSource('national_beverage_catalog')).toBe(true)
    expect(isNationalPackagedBeverageSource('catalog')).toBe(false)
    expect(isNationalPackagedBeverageSource(null)).toBe(false)
    expect(isNationalPackagedBeverageSource('')).toBe(false)
  })

  it('retorna a constante de fonte correta', () => {
    expect(getNationalPackagedBeverageSource()).toBe('national_beverage_catalog')
  })
})
