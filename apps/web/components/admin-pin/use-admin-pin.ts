'use client'

import { useState, useCallback } from 'react'
import { getStoredAdminPinToken } from '@/lib/admin-pin'

type AdminPinState = {
  isOpen: boolean
  title: string
  description: string
  onConfirmCallback: ((adminPinToken: string) => void) | null
}

export function useAdminPin() {
  const [state, setState] = useState<AdminPinState>({
    isOpen: false,
    title: 'Ação protegida',
    description: 'Digite o PIN de administrador para continuar.',
    onConfirmCallback: null,
  })

  /**
   * Open the PIN dialog, or skip it entirely if a valid token is already cached
   * in sessionStorage (token not expired).
   * The callback receives the adminPinToken string so the caller can forward it
   * to the API action that requires admin authorization.
   */
  const requirePin = useCallback(
    (
      onConfirm: (adminPinToken: string) => void,
      options?: { title?: string; description?: string },
    ) => {
      // Reuse an already-valid session token — avoids re-prompting on every action
      const cached = getStoredAdminPinToken()
      if (cached) {
        onConfirm(cached)
        return
      }

      setState({
        isOpen: true,
        title: options?.title ?? 'Ação protegida',
        description: options?.description ?? 'Digite o PIN de administrador para continuar.',
        onConfirmCallback: onConfirm,
      })
    },
    [],
  )

  function handleConfirm(adminPinToken: string) {
    state.onConfirmCallback?.(adminPinToken)
    setState((prev) => ({ ...prev, isOpen: false, onConfirmCallback: null }))
  }

  function handleCancel() {
    setState((prev) => ({ ...prev, isOpen: false, onConfirmCallback: null }))
  }

  return {
    pinDialogOpen: state.isOpen,
    pinDialogTitle: state.title,
    pinDialogDescription: state.description,
    requirePin,
    handlePinConfirm: handleConfirm,
    handlePinCancel: handleCancel,
  }
}
