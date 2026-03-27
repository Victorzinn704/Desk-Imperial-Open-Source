'use client'

import { useState, useCallback } from 'react'
import { verifyAdminPin, rememberAdminPinVerification } from '@/lib/admin-pin'
import { ApiError } from '@/lib/api'

type PinProtectionState = {
  isPinConfigured: boolean | null // null = desconhecido, true = configurado, false = não configurado
  isPinDialogOpen: boolean
  pinError: string | null
  isBlocked: boolean
  secondsLeft: number
}

export function usePinProtectedAction() {
  const [state, setState] = useState<PinProtectionState>({
    isPinConfigured: null,
    isPinDialogOpen: false,
    pinError: null,
    isBlocked: false,
    secondsLeft: 0,
  })

  const executeWithPin = useCallback(
    async (action: () => Promise<void>, pin?: string) => {
      try {
        if (state.isPinConfigured === null && !pin) {
          // Tentar determinar se PIN existe
          try {
            // Se tentamos chamar com PIN vazio e recebemos 404, PIN não está configurado
            await verifyAdminPin('')
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
              // PIN não está configurado — executar ação direto
              setState((prev) => ({
                ...prev,
                isPinConfigured: false,
                isPinDialogOpen: false,
              }))
              await action()
              return
            }
            // PIN está configurado mas não foi fornecido — abrir diálogo
            setState((prev) => ({ ...prev, isPinConfigured: true, isPinDialogOpen: true }))
            return
          }
        }

        if (pin) {
          // Verificar PIN fornecido
          const response = await verifyAdminPin(pin)
          rememberAdminPinVerification(response.verifiedUntil)

          // PIN correto — executar ação
          await action()
          setState((prev) => ({
            ...prev,
            isPinDialogOpen: false,
            pinError: null,
          }))
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 423) {
            // Rate limited
            const match = err.message.match(/(\d+)\s*s/i)
            const secs = match ? Number(match[1]) : 300
            setState((prev) => ({
              ...prev,
              isBlocked: true,
              secondsLeft: secs,
            }))
          } else if (err.status === 401) {
            setState((prev) => ({
              ...prev,
              pinError: 'PIN incorreto. Tente novamente.',
            }))
          } else {
            setState((prev) => ({
              ...prev,
              pinError: err.message || 'Erro ao verificar PIN',
            }))
          }
        } else {
          setState((prev) => ({
            ...prev,
            pinError: 'Erro inesperado',
          }))
        }
      }
    },
    [state.isPinConfigured],
  )

  const openDialog = useCallback(() => {
    setState((prev) => ({ ...prev, isPinDialogOpen: true, pinError: null }))
  }, [])

  const closeDialog = useCallback(() => {
    setState((prev) => ({ ...prev, isPinDialogOpen: false }))
  }, [])

  const resetBlockade = useCallback(() => {
    setState((prev) => ({ ...prev, isBlocked: false, secondsLeft: 0 }))
  }, [])

  return {
    ...state,
    executeWithPin,
    openDialog,
    closeDialog,
    resetBlockade,
  }
}
