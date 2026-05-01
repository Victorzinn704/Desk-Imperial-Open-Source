import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_THERMAL_PROVIDER, resolvePreferredPrinterId, setPreferredThermalPrinter } from './thermal-print.client'
import type { ThermalPrinter } from './thermal-print.types'

const SERIAL_COM3: ThermalPrinter = {
  id: 'qz-serial:COM3',
  name: 'Porta serial COM3',
  provider: 'QZ_TRAY',
  isDefault: true,
  transport: 'serial',
  target: 'COM3',
}

const QUEUE_YYX: ThermalPrinter = {
  id: 'qz-queue:YYX0808',
  name: 'YYX0808',
  provider: 'QZ_TRAY',
  isDefault: false,
  transport: 'queue',
  target: 'YYX0808',
}

describe('thermal printer preference', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('keeps a stored serial printer when it is available', () => {
    setPreferredThermalPrinter(DEFAULT_THERMAL_PROVIDER, SERIAL_COM3.id)

    const resolved = resolvePreferredPrinterId(DEFAULT_THERMAL_PROVIDER, [SERIAL_COM3, QUEUE_YYX])

    expect(resolved).toBe(SERIAL_COM3.id)
  })

  it('ignores stale Windows queue preference when a serial printer is available', () => {
    setPreferredThermalPrinter(DEFAULT_THERMAL_PROVIDER, QUEUE_YYX.id)

    const resolved = resolvePreferredPrinterId(DEFAULT_THERMAL_PROVIDER, [SERIAL_COM3, QUEUE_YYX])

    expect(resolved).toBe(SERIAL_COM3.id)
  })

  it('keeps a stored Windows queue when no serial printer exists', () => {
    setPreferredThermalPrinter(DEFAULT_THERMAL_PROVIDER, QUEUE_YYX.id)

    const resolved = resolvePreferredPrinterId(DEFAULT_THERMAL_PROVIDER, [QUEUE_YYX])

    expect(resolved).toBe(QUEUE_YYX.id)
  })
})
