import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the dashboard-navigation module
vi.mock('@/components/dashboard/dashboard-navigation', () => ({
  dashboardDefaultSection: 'overview' as const,
  dashboardDefaultSettingsSection: 'account' as const,
  dashboardNavigationGroups: [
    {
      id: 'workspace',
      label: 'Workspace',
      items: [{ id: 'overview', label: 'Dashboard', description: 'desc', icon: {} }],
    },
    {
      id: 'commercial',
      label: 'Operação',
      items: [
        { id: 'sales', label: 'Operação', description: 'desc', icon: {} },
        { id: 'pdv', label: 'PDV', description: 'desc', icon: {} },
        { id: 'salao', label: 'Salão', description: 'desc', icon: {} },
        { id: 'calendario', label: 'Calendário', description: 'desc', icon: {} },
        { id: 'payroll', label: 'Folha', description: 'desc', icon: {} },
      ],
    },
    {
      id: 'portfolio',
      label: 'Portfólio',
      items: [{ id: 'portfolio', label: 'Portfólio', description: 'desc', icon: {} }],
    },
  ],
  dashboardQuickActions: [{ id: 'new-sale', label: 'Nova Venda' }],
  parseDashboardSectionParam: (value: string | null) => {
    const valid = ['overview', 'sales', 'portfolio', 'pdv', 'calendario', 'payroll', 'salao', 'settings']
    return value && valid.includes(value) ? value : null
  },
  parseDashboardSettingsSectionParam: (value: string | null) => {
    const valid = ['account', 'security', 'preferences', 'compliance', 'session']
    return value && valid.includes(value) ? value : null
  },
}))

import { useDashboardNavigation } from './useDashboardNavigation'

describe('useDashboardNavigation', () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
    // Reset URL
    Object.defineProperty(window, 'location', {
      value: { search: '', href: 'http://localhost/dashboard' },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('non-staff user (owner)', () => {
    it('returns all navigation groups for owner', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))
      expect(result.current.navigationGroups).toHaveLength(3)
      expect(result.current.quickActions).toHaveLength(1)
    })

    it('defaults to overview section', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))
      expect(result.current.activeSection).toBe('overview')
    })

    it('uses initialSection when provided', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false, initialSection: 'sales' }))
      expect(result.current.activeSection).toBe('sales')
    })

    it('uses initialSettingsSection when provided', () => {
      const { result } = renderHook(() =>
        useDashboardNavigation({
          isStaffUser: false,
          initialSettingsSection: 'security',
        }),
      )
      expect(result.current.activeSettingsSection).toBe('security')
    })

    it('navigateToSection updates active section and pushes URL', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))

      act(() => {
        result.current.navigateToSection('portfolio')
      })

      expect(result.current.activeSection).toBe('portfolio')
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/dashboard?view=portfolio')
    })

    it('navigateToSection omits view param for default section', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false, initialSection: 'sales' }))

      act(() => {
        result.current.navigateToSection('overview')
      })

      expect(result.current.activeSection).toBe('overview')
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/dashboard')
    })

    it('navigateToSettings updates both section and settings section', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))

      act(() => {
        result.current.navigateToSettings('security')
      })

      expect(result.current.activeSection).toBe('settings')
      expect(result.current.activeSettingsSection).toBe('security')
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/dashboard?view=settings&panel=security')
    })
  })

  describe('staff user', () => {
    it('returns empty quickActions for staff', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: true }))
      expect(result.current.quickActions).toHaveLength(0)
    })

    it('filters navigation to only sales, pdv, calendario', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: true }))
      const allItemIds = result.current.navigationGroups.flatMap((g) => g.items.map((item) => item.id))
      expect(allItemIds).toEqual(['sales', 'pdv', 'calendario'])
    })

    it('removes groups that become empty after filtering', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: true }))
      // workspace group (only overview) should be removed
      // portfolio group (only portfolio) should be removed
      const groupIds = result.current.navigationGroups.map((g) => g.id)
      expect(groupIds).not.toContain('workspace')
      expect(groupIds).not.toContain('portfolio')
    })

    it('resolves to sales when active section is not in allowed set', () => {
      const { result } = renderHook(() =>
        useDashboardNavigation({
          isStaffUser: true,
          initialSection: 'overview', // not allowed for staff
        }),
      )
      expect(result.current.activeSection).toBe('sales')
    })

    it('allows settings section even for staff', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: true }))

      act(() => {
        result.current.navigateToSettings('account')
      })

      expect(result.current.activeSection).toBe('settings')
    })
  })

  describe('URL sync', () => {
    it('syncs from URL search params on mount', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?view=portfolio', href: 'http://localhost/dashboard?view=portfolio' },
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))

      expect(result.current.activeSection).toBe('portfolio')
    })

    it('syncs settings panel from URL', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?view=settings&panel=security',
          href: 'http://localhost/dashboard?view=settings&panel=security',
        },
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))

      expect(result.current.activeSection).toBe('settings')
      expect(result.current.activeSettingsSection).toBe('security')
    })

    it('handles popstate events', () => {
      const { result } = renderHook(() => useDashboardNavigation({ isStaffUser: false }))
      expect(result.current.activeSection).toBe('overview')

      // Simulate browser back changing the URL
      act(() => {
        Object.defineProperty(window, 'location', {
          value: { search: '?view=sales', href: 'http://localhost/dashboard?view=sales' },
          writable: true,
          configurable: true,
        })
        window.dispatchEvent(new PopStateEvent('popstate'))
      })

      expect(result.current.activeSection).toBe('sales')
    })
  })
})
