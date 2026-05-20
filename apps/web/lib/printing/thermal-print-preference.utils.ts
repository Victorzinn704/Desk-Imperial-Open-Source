'use client'

import type { ThermalPrinter, ThermalPrintProvider } from './thermal-print.types'
import { QZ_PREFERRED_SERIAL_PRINTER_ID } from './qz-tray.client'

export function getPreferredThermalPrinter(provider: ThermalPrintProvider) {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(buildPrinterStorageKey(provider))
}

export function setPreferredThermalPrinter(provider: ThermalPrintProvider, printerId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(buildPrinterStorageKey(provider), printerId)
}

export function markThermalPrinterVerified(provider: ThermalPrintProvider, printerId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(buildVerifiedPrinterStorageKey(provider), printerId)
  window.localStorage.setItem(buildPrinterStorageKey(provider), printerId)
}

export function resolvePreferredPrinterId(provider: ThermalPrintProvider, printers: ThermalPrinter[]) {
  return (
    resolvePreferredQzTraySerialPrinter(provider, printers) ??
    resolveVerifiedPrinterId(provider, printers) ??
    resolveStoredPrinterId(provider, printers) ??
    resolveProviderFallbackPrinterId(provider, printers)
  )
}

function resolvePreferredQzTraySerialPrinter(provider: ThermalPrintProvider, printers: ThermalPrinter[]) {
  if (provider !== 'QZ_TRAY') {
    return null
  }

  const preferredPrinter = printers.find(
    (printer) => printer.transport === 'serial' && printer.id === QZ_PREFERRED_SERIAL_PRINTER_ID,
  )
  return preferredPrinter?.id ?? null
}

function resolveVerifiedPrinterId(provider: ThermalPrintProvider, printers: ThermalPrinter[]) {
  const verifiedPrinterId = getVerifiedThermalPrinter(provider)
  return findMatchingPrinterId(printers, verifiedPrinterId)
}

function resolveStoredPrinterId(provider: ThermalPrintProvider, printers: ThermalPrinter[]) {
  const storedPrinterId = getPreferredThermalPrinter(provider)
  const matchedPrinterId = findMatchingPrinterId(printers, storedPrinterId)

  if (storedPrinterId && !matchedPrinterId && printers.length > 0) {
    clearStaleStoredPrinter(provider)
  }

  if (matchedPrinterId) {
    const matchedPrinter = printers.find((printer) => printer.id === matchedPrinterId)
    if (matchedPrinter?.transport === 'serial') {
      return matchedPrinter.id
    }
  }

  return matchedPrinterId
}

function resolveProviderFallbackPrinterId(provider: ThermalPrintProvider, printers: ThermalPrinter[]) {
  const defaultSerialPrinter = printers.find((printer) => printer.transport === 'serial' && printer.isDefault)
  const firstSerialPrinter = printers.find((printer) => printer.transport === 'serial')

  if (provider === 'QZ_TRAY' && firstSerialPrinter) {
    return defaultSerialPrinter?.id ?? firstSerialPrinter.id
  }

  return printers.find((printer) => printer.isDefault)?.id ?? printers[0]?.id ?? ''
}

function getVerifiedThermalPrinter(provider: ThermalPrintProvider) {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(buildVerifiedPrinterStorageKey(provider))
}

function clearStaleStoredPrinter(provider: ThermalPrintProvider) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(buildPrinterStorageKey(provider))
  window.localStorage.removeItem(buildVerifiedPrinterStorageKey(provider))
}

function findMatchingPrinterId(printers: ThermalPrinter[], persistedPrinterId: string | null) {
  const matchedPrinter = printers.find(
    (printer) =>
      printer.id === persistedPrinterId || printer.name === persistedPrinterId || printer.target === persistedPrinterId,
  )

  return matchedPrinter?.id ?? null
}

function buildPrinterStorageKey(provider: ThermalPrintProvider) {
  return `desk-imperial.thermal-printer.${provider}`
}

function buildVerifiedPrinterStorageKey(provider: ThermalPrintProvider) {
  return `${buildPrinterStorageKey(provider)}.verified`
}
