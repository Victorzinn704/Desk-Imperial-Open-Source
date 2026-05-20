'use client'

import { type Dispatch, type SetStateAction, useCallback } from 'react'

type PercentGuardArgs = Readonly<{
  acrescimo: number
  desconto: number
  requirePin: (action: () => void, title: string, description: string) => void
  setAcrescimo: Dispatch<SetStateAction<number>>
  setDesconto: Dispatch<SetStateAction<number>>
}>

export function useComandaModalPercentGuards({
  acrescimo,
  desconto,
  requirePin,
  setAcrescimo,
  setDesconto,
}: PercentGuardArgs) {
  const handleDescontoChange = useCallback(
    (newValue: number) =>
      applyProtectedPercentChange({
        currentValue: desconto,
        newValue,
        pinDescription: (value) => `Confirme o desconto de ${value}% com seu PIN.`,
        pinTitle: 'Aplicar Desconto',
        requirePin,
        setter: setDesconto,
      }),
    [desconto, requirePin, setDesconto],
  )

  const handleAcrescimoChange = useCallback(
    (newValue: number) =>
      applyProtectedPercentChange({
        currentValue: acrescimo,
        newValue,
        pinDescription: (value) => `Confirme o acréscimo de ${value}% com seu PIN.`,
        pinTitle: 'Aplicar Acréscimo',
        requirePin,
        setter: setAcrescimo,
      }),
    [acrescimo, requirePin, setAcrescimo],
  )

  return {
    handleAcrescimoChange,
    handleDescontoChange,
  }
}

function applyProtectedPercentChange({
  currentValue,
  newValue,
  pinDescription,
  pinTitle,
  requirePin,
  setter,
}: Readonly<{
  currentValue: number
  newValue: number
  pinDescription: (value: number) => string
  pinTitle: string
  requirePin: (action: () => void, title: string, description: string) => void
  setter: Dispatch<SetStateAction<number>>
}>) {
  if (newValue > 0 && newValue !== currentValue) {
    requirePin(() => setter(newValue), pinTitle, pinDescription(newValue))
    return
  }

  setter(newValue)
}
