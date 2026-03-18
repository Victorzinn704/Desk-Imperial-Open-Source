'use client'

import { useState, useCallback } from 'react'

type AdminPinState = {
  isOpen: boolean
  title: string
  description: string
  onConfirmCallback: (() => void) | null
}

export function useAdminPin() {
  const [state, setState] = useState<AdminPinState>({
    isOpen: false,
    title: 'Ação protegida',
    description: 'Digite o PIN de administrador para continuar.',
    onConfirmCallback: null,
  })

  function isPinConfigured(): boolean {
    return Boolean(localStorage.getItem('desk_imperial_pin'))
  }

  const requirePin = useCallback(
    (
      onConfirm: () => void,
      options?: { title?: string; description?: string },
    ) => {
      if (!isPinConfigured()) {
        onConfirm()
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

  function handleConfirm() {
    state.onConfirmCallback?.()
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
