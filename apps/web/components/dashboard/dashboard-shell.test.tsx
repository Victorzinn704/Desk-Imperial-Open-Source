import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme: vi.fn(),
  }),
}))

import { getSessionErrorMessage, resolveActiveNavigation } from './dashboard-shell'

describe('dashboard-shell helpers', () => {
  it('returns a stable fallback error message for non-API failures', () => {
    expect(getSessionErrorMessage(new Error('boom'))).toMatch(/conecte a api/i)
    expect(getSessionErrorMessage(new ApiError('Sessão expirada', 401))).toBe('Sessão expirada')
  })

  it('resolves navigation fallback for settings when the active item is absent', () => {
    const navigation = resolveActiveNavigation('settings', [
      {
        items: [{ id: 'overview', label: 'Visão geral', description: 'Resumo' }],
      },
    ])

    expect(navigation).toEqual(
      expect.objectContaining({
        id: 'settings',
        label: 'Conta e preferências',
      }),
    )
  })
})
