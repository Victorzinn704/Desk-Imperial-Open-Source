/**
 * @file normalize-table-label.test.ts
 *
 * Full coverage for normalizeTableLabel utility.
 */

import { describe, expect, it } from 'vitest'
import { normalizeTableLabel } from './normalize-table-label'

describe('normalizeTableLabel', () => {
  it('retorna string vazia para input vazio', () => {
    expect(normalizeTableLabel('')).toBe('')
    expect(normalizeTableLabel('   ')).toBe('')
  })

  it('remove prefixo "mesa" e normaliza numero', () => {
    expect(normalizeTableLabel('mesa 2')).toBe('2')
    expect(normalizeTableLabel('Mesa 2')).toBe('2')
    expect(normalizeTableLabel('MESA 2')).toBe('2')
    expect(normalizeTableLabel('mesa2')).toBe('2')
  })

  it('remove prefixo "ms" e "m"', () => {
    expect(normalizeTableLabel('ms2')).toBe('2')
    expect(normalizeTableLabel('Ms 2')).toBe('2')
    expect(normalizeTableLabel('m 2')).toBe('2')
  })

  it('remove simbolos intermediarios (nº, #, -, .)', () => {
    expect(normalizeTableLabel('Mesa nº 2')).toBe('2')
    expect(normalizeTableLabel('Mesa #2')).toBe('2')
    expect(normalizeTableLabel('MESA-02')).toBe('2')
    expect(normalizeTableLabel('Mesa.2')).toBe('2')
  })

  it('remove zeros a esquerda de numeros', () => {
    expect(normalizeTableLabel('02')).toBe('2')
    expect(normalizeTableLabel('007')).toBe('7')
    expect(normalizeTableLabel('Mesa 001')).toBe('1')
  })

  it('retorna numero simples sem modificacao', () => {
    expect(normalizeTableLabel('2')).toBe('2')
    expect(normalizeTableLabel('12')).toBe('12')
  })

  it('normaliza labels especiais para uppercase', () => {
    expect(normalizeTableLabel('vip')).toBe('VIP')
    expect(normalizeTableLabel('VIP')).toBe('VIP')
    expect(normalizeTableLabel('mesa vip')).toBe('VIP')
    expect(normalizeTableLabel('bar')).toBe('BAR')
    expect(normalizeTableLabel('BAR')).toBe('BAR')
  })

  it('remove espacos extras ao redor', () => {
    expect(normalizeTableLabel('  mesa 5  ')).toBe('5')
    expect(normalizeTableLabel('  VIP  ')).toBe('VIP')
  })

  it('lida com prefixo seguido de traco e espaco', () => {
    expect(normalizeTableLabel('Mesa - 10')).toBe('10')
    expect(normalizeTableLabel('Mesa – 10')).toBe('10')
  })

  it('preserva labels alfanumericos complexos em uppercase', () => {
    expect(normalizeTableLabel('mesa A1')).toBe('A1')
    expect(normalizeTableLabel('Terraço')).toBe('TERRAÇO')
  })
})
