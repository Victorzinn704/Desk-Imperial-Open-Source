'use client'

import { useEffect } from 'react'
import { AdminPinDialog } from './admin-pin-dialog'
import { useProtectedOperation } from './use-protected-operation'

type ProtectedOperationGuardProps = {
  onConfirm?: (pin: string) => Promise<void>
  onError?: (error: Error) => void
}

/**
 * Wrapper component that provides PIN protection for sensitive operations.
 * Use the `useProtectedOperationGuard()` hook in your component to open the dialog.
 */
export function ProtectedOperationGuard({ onConfirm, onError }: Readonly<ProtectedOperationGuardProps>) {
  const {
    isDialogOpen,
    dialogTitle,
    dialogDescription,
    isBlocked,
    secondsLeft,
    setSecondsLeft,
    setIsBlocked,
    handleCancel,
  } = useProtectedOperation()

  // Countdown timer for rate limiting
  useEffect(() => {
    if (!isBlocked || secondsLeft <= 0) return
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1
        if (next <= 0) {
          setIsBlocked(false)
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isBlocked, secondsLeft, setSecondsLeft, setIsBlocked])

  const handlePinConfirm = () => {
    if (onConfirm) {
      onConfirm('').catch((error: unknown) => {
        if (onError && error instanceof Error) {
          onError(error)
        }
      })
    }
  }

  if (!isDialogOpen) {
    return null
  }

  return (
    <AdminPinDialog
      title={dialogTitle}
      description={dialogDescription}
      onConfirm={handlePinConfirm}
      onCancel={handleCancel}
    />
  )
}
