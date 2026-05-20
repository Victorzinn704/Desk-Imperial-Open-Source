import { describe, expect, it } from 'vitest'
import { normalizeTextForSearch } from './normalize-text-for-search'

describe('normalizeTextForSearch', () => {
  it('lowercases input', () => {
    expect(normalizeTextForSearch('HELLO')).toBe('hello')
  })

  it('removes accents from Portuguese characters', () => {
    expect(normalizeTextForSearch('Café')).toBe('cafe')
    expect(normalizeTextForSearch('São Paulo')).toBe('sao paulo')
    expect(normalizeTextForSearch('ação')).toBe('acao')
    expect(normalizeTextForSearch('preço')).toBe('preco')
  })

  it('removes various diacritical marks', () => {
    expect(normalizeTextForSearch('à á â ã ä')).toBe('a a a a a')
    expect(normalizeTextForSearch('è é ê ë')).toBe('e e e e')
    expect(normalizeTextForSearch('ì í î ï')).toBe('i i i i')
    expect(normalizeTextForSearch('ò ó ô õ ö')).toBe('o o o o o')
    expect(normalizeTextForSearch('ù ú û ü')).toBe('u u u u')
    expect(normalizeTextForSearch('ñ')).toBe('n')
    expect(normalizeTextForSearch('ç')).toBe('c')
  })

  it('handles already normalized strings', () => {
    expect(normalizeTextForSearch('hello world')).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(normalizeTextForSearch('')).toBe('')
  })

  it('handles mixed case with accents', () => {
    expect(normalizeTextForSearch('Calendário Comercial')).toBe('calendario comercial')
  })

  it('preserves numbers and special chars', () => {
    expect(normalizeTextForSearch('R$ 10,00')).toBe('r$ 10,00')
  })

  it('handles string with only diacritics removed but keeping base', () => {
    expect(normalizeTextForSearch('Portfólio')).toBe('portfolio')
    expect(normalizeTextForSearch('funcionário')).toBe('funcionario')
    expect(normalizeTextForSearch('concorrência')).toBe('concorrencia')
  })
})
