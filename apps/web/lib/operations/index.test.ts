import { describe, expect, it } from 'vitest'
import * as operations from './index'

describe('operations index exports', () => {
  it('re-exports adapter, query and visual helpers', () => {
    expect(typeof operations.buildOperationsViewModel).toBe('function')
    expect(typeof operations.buildOperationsExecutiveKpis).toBe('function')
    expect(typeof operations.appendOptimisticComanda).toBe('function')
    expect(typeof operations.formatMoney).toBe('function')
  })
})
