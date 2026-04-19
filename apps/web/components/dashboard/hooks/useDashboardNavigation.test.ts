import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useDashboardNavigation } from './useDashboardNavigation'

describe('useDashboardNavigation', () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>
  let replaceStateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
    replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
    Object.defineProperty(window, 'location', {
      value: { search: '', href: 'http://localhost/dashboard' },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('owner', () => {
    it('returns the six product sections with default overview tab', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))

      const itemIds = result.current.navigationGroups.flatMap((group) => group.items.map((item) => item.id))
      expect(itemIds).toEqual(['overview', 'pdv', 'salao', 'financeiro', 'pedidos', 'equipe'])
      expect(result.current.activeSection).toBe('overview')
      expect(result.current.activeDisplaySection).toBe('overview')
      expect(result.current.activeTab).toBe('principal')
      expect(result.current.sectionTabs).toHaveLength(5)
      expect(result.current.quickActions).toHaveLength(0)
      expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/dashboard?view=overview&tab=principal')
    })

    it('uses initial section and tab when provided', () => {
      const { result } = renderHook(() =>
        useDashboardNavigation({ isStaffUser: false, initialSection: 'financeiro', initialTab: 'dre' }),
      )

      expect(result.current.activeSection).toBe('financeiro')
      expect(result.current.activeDisplaySection).toBe('financeiro')
      expect(result.current.activeTab).toBe('dre')
    })

    it('navigateToSection updates section, default tab and URL', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))

      act(() => {
        result.current.navigateToSection('pdv')
      })

      expect(result.current.activeSection).toBe('pdv')
      expect(result.current.activeTab).toBe('grid')
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/dashboard?view=pdv&tab=grid')
    })

    it('persists explicit tab param for overview subsections', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))

      act(() => {
        result.current.navigateToSection('overview', 'meta')
      })

      expect(result.current.activeSection).toBe('overview')
      expect(result.current.activeTab).toBe('meta')
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/dashboard?view=overview&tab=meta')
    })

    it('navigateToTab keeps the display section and pushes tab URL', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))

      act(() => {
        result.current.navigateToTab('editorial')
      })

      expect(result.current.activeSection).toBe('overview')
      expect(result.current.activeTab).toBe('editorial')
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/dashboard?view=overview&tab=editorial')
    })

    it('navigateToSettings keeps panel compatibility', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))

      act(() => {
        result.current.navigateToSettings('security')
      })

      expect(result.current.activeSection).toBe('settings')
      expect(result.current.activeSettingsSection).toBe('security')
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/dashboard?view=settings&panel=security')
    })
  })

  describe('staff', () => {
    it('filters navigation to operational sections', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: true }))
      const itemIds = result.current.navigationGroups.flatMap((group) => group.items.map((item) => item.id))

      expect(itemIds).toEqual(['pdv', 'salao', 'pedidos'])
      expect(result.current.quickActions).toHaveLength(0)
    })

    it('resolves to PDV when active section is not allowed', () => {
      const { result } = renderHook(() =>
        useDashboardNavigation({
          isStaffUser: true,
          initialSection: 'overview',
        }),
      )

      expect(result.current.activeSection).toBe('pdv')
      expect(result.current.activeTab).toBe('grid')
    })

    it('allows settings for staff', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: true }))

      act(() => {
        result.current.navigateToSettings('account')
      })

      expect(result.current.activeSection).toBe('settings')
    })
  })

  describe('URL sync', () => {
    it('maps old portfolio URL to PDV display section while preserving legacy environment id', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?view=portfolio', href: 'http://localhost/dashboard?view=portfolio' },
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))

      expect(result.current.activeSection).toBe('portfolio')
      expect(result.current.activeDisplaySection).toBe('pdv')
      expect(result.current.activeTab).toBe('grid')
    })

    it('syncs new view and tab from URL', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?view=equipe&tab=folha', href: 'http://localhost/dashboard?view=equipe&tab=folha' },
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))

      expect(result.current.activeSection).toBe('equipe')
      expect(result.current.activeDisplaySection).toBe('equipe')
      expect(result.current.activeTab).toBe('folha')
    })

    it('canonicaliza URLs de seção sem tab explícita', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?view=financeiro', href: 'http://localhost/dashboard?view=financeiro' },
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))

      expect(result.current.activeSection).toBe('financeiro')
      expect(result.current.activeTab).toBe('movimentacao')
      expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/dashboard?view=financeiro&tab=movimentacao')
    })

    it('handles popstate events with tab changes', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))
      expect(result.current.activeSection).toBe('overview')

      act(() => {
        Object.defineProperty(window, 'location', {
          value: { search: '?view=pedidos&tab=kanban', href: 'http://localhost/dashboard?view=pedidos&tab=kanban' },
          writable: true,
          configurable: true,
        })
        window.dispatchEvent(new PopStateEvent('popstate'))
      })

      expect(result.current.activeSection).toBe('pedidos')
      expect(result.current.activeTab).toBe('kanban')
    })
  })
})
