'use client'

import { useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'
import { fetchAdminPinStatus, removeAdminPin } from '@/lib/admin-pin'
import { getLastDigit, parseRetryAfterSeconds } from '@/lib/pin-input'
import { savePinAction } from './pin-setup-card.model'

const emptyPinDigits = ['', '', '', '']

export function usePinSetupCardController() {
  const [pinDigits, setPinDigits] = useState(emptyPinDigits)
  const [pinSaved, setPinSaved] = useState(false)
  const [pinSaving, setPinSaving] = useState(false)
  const [pinSaveError, setPinSaveError] = useState('')
  const [pinActive, setPinActive] = useState(false)
  const [showConfirmRemove, setShowConfirmRemove] = useState(false)
  const [confirmRemoveDigits, setConfirmRemoveDigits] = useState(emptyPinDigits)
  const [confirmRemoveError, setConfirmRemoveError] = useState('')
  const [removeBlocked, setRemoveBlocked] = useState(false)
  const [removeSecondsLeft, setRemoveSecondsLeft] = useState(0)
  const [removing, setRemoving] = useState(false)
  const removeInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => {
    let mounted = true

    void fetchAdminPinStatus()
      .then((response) => {
        if (mounted) {
          setPinActive(response.configured)
        }
      })
      .catch(() => {
        if (mounted) {
          setPinActive(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!removeBlocked) {
      return
    }

    const intervalId = globalThis.setInterval(() => {
      setRemoveSecondsLeft((current) => {
        if (current <= 1) {
          globalThis.clearInterval(intervalId)
          setRemoveBlocked(false)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => globalThis.clearInterval(intervalId)
  }, [removeBlocked])

  const handleSavePin = () =>
    savePinAction(pinDigits, setPinSaving, setPinSaveError, setPinSaved, setPinActive, setPinDigits)

  function openRemoveConfirmation() {
    setShowConfirmRemove(true)
    setConfirmRemoveDigits(emptyPinDigits)
    setConfirmRemoveError('')
    setRemoveBlocked(false)
  }

  function cancelRemoveConfirmation() {
    setShowConfirmRemove(false)
    setConfirmRemoveDigits(emptyPinDigits)
    setConfirmRemoveError('')
  }

  function handleRemoveError(error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 423) {
        setRemoveBlocked(true)
        setRemoveSecondsLeft(parseRetryAfterSeconds(error.message, 300))
      } else {
        setConfirmRemoveError(error.message || 'PIN incorreto. Tente novamente.')
        globalThis.setTimeout(() => removeInputRefs[0].current?.focus(), 50)
      }
    } else {
      setConfirmRemoveError('Erro inesperado ao remover o PIN.')
    }
  }

  async function attemptRemovePin(pin: string) {
    setRemoving(true)

    try {
      await removeAdminPin(pin)
      setPinActive(false)
      setShowConfirmRemove(false)
      setConfirmRemoveDigits(emptyPinDigits)
      setConfirmRemoveError('')
    } catch (error) {
      setConfirmRemoveDigits(emptyPinDigits)
      handleRemoveError(error)
    } finally {
      setRemoving(false)
    }
  }

  async function handleConfirmRemoveDigitChange(index: number, rawValue: string) {
    const value = getLastDigit(rawValue)
    const next = [...confirmRemoveDigits]
    next[index] = value
    setConfirmRemoveDigits(next)
    setConfirmRemoveError('')

    if (value && index < 3) {
      removeInputRefs[index + 1].current?.focus()
    }

    if (value && next.every((digit) => digit !== '')) {
      await attemptRemovePin(next.join(''))
    }
  }

  return {
    cancelRemoveConfirmation,
    confirmRemoveDigits,
    confirmRemoveError,
    handleConfirmRemoveDigitChange,
    handleSavePin,
    openRemoveConfirmation,
    pinActive,
    pinDigits,
    pinSaveError,
    pinSaved,
    pinSaving,
    removeBlocked,
    removeInputRefs,
    removeSecondsLeft,
    removing,
    setPinDigits,
    setPinSaveError,
    showConfirmRemove,
  }
}

export type PinSetupCardController = ReturnType<typeof usePinSetupCardController>
