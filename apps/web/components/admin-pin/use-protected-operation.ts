'use client'

import { useState, useRef, useCallback } from 'react'
import { rememberAdminPinVerification, verifyAdminPin } from '@/lib/admin-pin'
import { ApiError } from '@/lib/api'

type ProtectedOperation = {
  title?: string
  description?: string
  action: () => Promise<void>
}

export function useProtectedOperation() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogTitle, setDialogTitle] = useState('Ação protegida')
  const [dialogDescription, setDialogDescription] = useState('Digite o PIN de administrador para continuar.')
  const [isBlocked, setIsBlocked] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const operationRef = useRef<ProtectedOperation | null>(null)

  const open = useCallback((operation: ProtectedOperation) => {
    setDialogTitle(operation.title ?? 'Ação protegida')
    setDialogDescription(operation.description ?? 'Digite o PIN de administrador para continuar.')
    setIsDialogOpen(true)
    setIsBlocked(false)
    setSecondsLeft(0)
    operationRef.current = operation
  }, [])

  const handleConfirm = useCallback(async (pin: string) => {
    try {
      // Verify PIN with the server
      const response = await verifyAdminPin(pin)
      rememberAdminPinVerification(response.verifiedUntil)

      // Execute the protected operation
      if (operationRef.current) {
        await operationRef.current.action()
      }

      // Close the dialog
      setIsDialogOpen(false)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 423) {
          // Rate-limited
          const match = err.message.match(/(\d+)\s*s/i)
          const secs = match ? Number(match[1]) : 300
          setIsBlocked(true)
          setSecondsLeft(secs)
        } else if (err.status === 404) {
          // PIN not configured — allow the action through
          if (operationRef.current) {
            await operationRef.current.action()
          }
          setIsDialogOpen(false)
        }
        // Return error for the dialog component to handle
        throw err
      }
      throw err
    }
  }, [])

  const handleCancel = useCallback(() => {
    setIsDialogOpen(false)
  }, [])

  return {
    isDialogOpen,
    dialogTitle,
    dialogDescription,
    isBlocked,
    secondsLeft,
    setSecondsLeft,
    setIsBlocked,
    open,
    handleConfirm,
    handleCancel,
  }
}
