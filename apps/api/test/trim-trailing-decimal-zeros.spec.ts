import { trimTrailingDecimalZeros } from '../../../packages/types/src/trim-trailing-decimal-zeros'

describe('trimTrailingDecimalZeros', () => {
  it('preserva inteiros sem separador decimal', () => {
    expect(trimTrailingDecimalZeros('12')).toBe('12')
  })

  it('remove zeros fracionarios desnecessarios', () => {
    expect(trimTrailingDecimalZeros('12.30')).toBe('12.3')
    expect(trimTrailingDecimalZeros('12.00')).toBe('12')
  })

  it('mantem decimais significativos', () => {
    expect(trimTrailingDecimalZeros('12.34')).toBe('12.34')
  })

  it('remove todos os zeros finais sem truncar o separador incorretamente', () => {
    expect(trimTrailingDecimalZeros('120.1000')).toBe('120.1')
    expect(trimTrailingDecimalZeros('120.0000')).toBe('120')
  })
})
