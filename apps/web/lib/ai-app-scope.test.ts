import { describe, expect, it } from 'vitest'
import { isAppScopedAiFocus, APP_SCOPED_AI_MESSAGE } from './ai-app-scope'

describe('ai-app-scope', () => {
  describe('APP_SCOPED_AI_MESSAGE', () => {
    it('is a non-empty string', () => {
      expect(typeof APP_SCOPED_AI_MESSAGE).toBe('string')
      expect(APP_SCOPED_AI_MESSAGE.length).toBeGreaterThan(0)
    })
  })

  describe('isAppScopedAiFocus', () => {
    it('returns true for exact scope terms', () => {
      const shouldMatch = [
        'vendas',
        'estoque',
        'dashboard',
        'pedido',
        'pdv',
        'caixa',
        'equipe',
        'financeiro',
        'produto',
        'calendario',
        'salao',
        'perfil',
        'portfolio',
      ]
      for (const term of shouldMatch) {
        expect(isAppScopedAiFocus(term)).toBe(true)
      }
    })

    it('returns true for terms with accents', () => {
      expect(isAppScopedAiFocus('calendário')).toBe(true)
      expect(isAppScopedAiFocus('portfólio')).toBe(true)
      expect(isAppScopedAiFocus('comércio')).toBe(true)
      expect(isAppScopedAiFocus('operação')).toBe(true)
      expect(isAppScopedAiFocus('concorrência')).toBe(true)
    })

    it('is case insensitive', () => {
      expect(isAppScopedAiFocus('VENDAS')).toBe(true)
      expect(isAppScopedAiFocus('Dashboard')).toBe(true)
      expect(isAppScopedAiFocus('PDV')).toBe(true)
      expect(isAppScopedAiFocus('CALENDÁRIO')).toBe(true)
    })

    it('matches terms within a longer sentence', () => {
      expect(isAppScopedAiFocus('como ver minhas vendas do dia')).toBe(true)
      expect(isAppScopedAiFocus('preciso de ajuda com o estoque')).toBe(true)
      expect(isAppScopedAiFocus('quero abrir o dashboard')).toBe(true)
    })

    it('returns false for out-of-scope queries', () => {
      expect(isAppScopedAiFocus('qual é a capital da França')).toBe(false)
      expect(isAppScopedAiFocus('receita de bolo de chocolate')).toBe(false)
      expect(isAppScopedAiFocus('previsão do tempo')).toBe(false)
      expect(isAppScopedAiFocus('qual a cotação do dólar')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isAppScopedAiFocus('')).toBe(false)
    })

    it('handles input with mixed accented and unaccented chars', () => {
      expect(isAppScopedAiFocus('precificacao de produtos')).toBe(true)
      expect(isAppScopedAiFocus('precificação de produtos')).toBe(true)
    })

    it('matches "cross-selling" term', () => {
      expect(isAppScopedAiFocus('estratégia de cross-selling')).toBe(true)
    })

    it('matches "visão executiva geral"', () => {
      expect(isAppScopedAiFocus('quero a visão executiva geral')).toBe(true)
      expect(isAppScopedAiFocus('visao executiva geral')).toBe(true)
    })

    it('matches plural forms', () => {
      expect(isAppScopedAiFocus('ver todos os pedidos')).toBe(true)
      expect(isAppScopedAiFocus('listar produtos')).toBe(true)
      expect(isAppScopedAiFocus('minhas comandas')).toBe(true)
      expect(isAppScopedAiFocus('quais são os canais')).toBe(true)
    })
  })
})
