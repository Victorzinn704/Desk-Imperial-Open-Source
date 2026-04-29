'use client'

import { useCallback, useRef, useState } from 'react'

export function useComandaModalPin() {
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const [pinDialogTitle, setPinDialogTitle] = useState('Ação protegida')
  const [pinDialogDescription, setPinDialogDescription] = useState('Digite o PIN para confirmar')
  const pinActionRef = useRef<(() => void) | null>(null)

  const requirePin = useCallback((action: () => void, title: string, description: string) => {
    setPinDialogTitle(title)
    setPinDialogDescription(description)
    pinActionRef.current = action
    setIsPinDialogOpen(true)
  }, [])

  const handlePinConfirm = useCallback(() => {
    pinActionRef.current?.()
    setIsPinDialogOpen(false)
    pinActionRef.current = null
  }, [])

  const handlePinCancel = useCallback(() => {
    setIsPinDialogOpen(false)
    pinActionRef.current = null
  }, [])

  return {
    handlePinCancel,
    handlePinConfirm,
    isPinDialogOpen,
    pinDialogDescription,
    pinDialogTitle,
    requirePin,
  }
}
