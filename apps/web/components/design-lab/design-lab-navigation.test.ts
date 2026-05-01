import { describe, expect, it } from 'vitest'
import {
  buildDesignLabConfigHref,
  buildDesignLabFinanceiroHref,
  buildDesignLabHref,
  buildDesignLabPdvHref,
  buildDesignLabPedidosHref,
  mapDashboardLocationToDesignLabHref,
  mapDashboardSectionToDesignLabHref,
  parseDesignLabFinanceiroTab,
  parseDesignLabPdvTab,
  parseDesignLabPedidosTab,
} from './design-lab-navigation'

describe('design-lab-navigation', () => {
  describe('href builders', () => {
    it('builds base section href without query string noise', () => {
      expect(buildDesignLabHref('overview')).toBe('/design-lab/overview')
      expect(buildDesignLabHref('portfolio', { tab: '', mode: null, q: undefined })).toBe('/design-lab/portfolio')
      expect(buildDesignLabHref('cadastro-rapido')).toBe('/design-lab/cadastro-rapido')
    })

    it('builds pdv href preserving mesa and comanda context', () => {
      expect(
        buildDesignLabPdvHref({
          tab: 'comandas',
          comandaId: 'cmd-11',
          mesaId: 'mesa-07',
          mesaLabel: 'Mesa 7',
        }),
      ).toBe('/design-lab/pdv?tab=comandas&comanda=cmd-11&mesaId=mesa-07&mesaLabel=Mesa+7')
    })

    it('builds dedicated financeiro, pedidos and config hrefs', () => {
      expect(buildDesignLabFinanceiroHref('dre')).toBe('/design-lab/financeiro?tab=dre')
      expect(buildDesignLabPedidosHref('historico')).toBe('/design-lab/pedidos?tab=historico')
      expect(buildDesignLabConfigHref('security')).toBe('/design-lab/config?tab=security')
    })
  })

  describe('dashboard aliases', () => {
    it('maps old dashboard sections into canonical design-lab routes', () => {
      expect(mapDashboardSectionToDesignLabHref('overview')).toBe('/design-lab/overview')
      expect(mapDashboardSectionToDesignLabHref('pedidos')).toBe('/design-lab/pedidos?tab=historico')
      expect(mapDashboardSectionToDesignLabHref('map')).toBe('/design-lab/financeiro?tab=mapa')
      expect(mapDashboardSectionToDesignLabHref('settings')).toBe('/design-lab/config?tab=account')
      expect(mapDashboardSectionToDesignLabHref('sales')).toBe('/design-lab/overview')
    })

    it('maps dashboard location into the correct design-lab section and tab', () => {
      expect(
        mapDashboardLocationToDesignLabHref({
          sectionId: 'pdv',
          tabId: 'kds',
        }),
      ).toBe('/design-lab/pdv?tab=kds')

      expect(
        mapDashboardLocationToDesignLabHref({
          sectionId: 'salao',
          tabId: 'permanencia',
        }),
      ).toBe('/design-lab/salao?tab=comandas')

      expect(
        mapDashboardLocationToDesignLabHref({
          sectionId: 'equipe',
          tabId: 'folha',
        }),
      ).toBe('/design-lab/payroll')

      expect(
        mapDashboardLocationToDesignLabHref({
          sectionId: 'settings',
          settingsSectionId: 'preferences',
        }),
      ).toBe('/design-lab/config?tab=preferences')
    })

    it('falls back safely when dashboard tab is missing or not supported', () => {
      expect(
        mapDashboardLocationToDesignLabHref({
          sectionId: 'financeiro',
          tabId: 'principal',
        }),
      ).toBe('/design-lab/financeiro?tab=movimentacao')

      expect(
        mapDashboardLocationToDesignLabHref({
          sectionId: 'pedidos',
          tabId: 'principal',
        }),
      ).toBe('/design-lab/pedidos?tab=tabela')
    })
  })

  describe('tab parsers', () => {
    it('accepts valid tabs and rejects invalid values', () => {
      expect(parseDesignLabPdvTab('cobranca')).toBe('cobranca')
      expect(parseDesignLabPdvTab('xpto')).toBe('grid')

      expect(parseDesignLabPedidosTab('historico')).toBe('historico')
      expect(parseDesignLabPedidosTab('')).toBe('tabela')

      expect(parseDesignLabFinanceiroTab('contas')).toBe('contas')
      expect(parseDesignLabFinanceiroTab(undefined)).toBe('movimentacao')
    })
  })
})
