import { describe, expect, it } from 'vitest'
import { getLastDigit, parseRetryAfterSeconds } from './pin-input'

describe('pin-input', () => {
  describe('getLastDigit', () => {
    it('returns the last ASCII digit from mixed input', () => {
      expect(getLastDigit('ab12c3')).toBe('3')
    })

    it('returns empty string when no digit exists', () => {
      expect(getLastDigit('abcd')).toBe('')
    })
  })

  describe('parseRetryAfterSeconds', () => {
    it('reads seconds written as compact suffix', () => {
      expect(parseRetryAfterSeconds('Tente novamente em 30s.', 300)).toBe(30)
    })

    it('reads seconds written with whitespace and word suffix', () => {
      expect(parseRetryAfterSeconds('Aguarde 45 seconds antes de tentar.', 300)).toBe(45)
    })

    it('ignores unrelated numbers before the retry duration', () => {
      expect(parseRetryAfterSeconds('Erro 423: aguarde 300 s antes de tentar.', 300)).toBe(300)
    })

    it('keeps zero seconds when the server sends it explicitly', () => {
      expect(parseRetryAfterSeconds('Aguarde 0s.', 300)).toBe(0)
    })

    it('falls back when the message has no seconds unit', () => {
      expect(parseRetryAfterSeconds('Aguarde 5 minutos.', 300)).toBe(300)
    })
  })
})
