'use client'

import { useRef, useState, useEffect } from 'react'
import { LockKeyhole, X, ShieldAlert } from 'lucide-react'
import { getPinRateStatus, recordPinFailure, recordPinSuccess, type PinRateStatus } from '@/lib/pin-rate-limiter'

type AdminPinDialogProps = {
  title?: string
  description?: string
  onConfirm: () => void
  onCancel: () => void
}

export function AdminPinDialog({
  title = 'Ação protegida',
  description = 'Digite o PIN de administrador para continuar.',
  onConfirm,
  onCancel,
}: Readonly<AdminPinDialogProps>) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [status, setStatus] = useState<PinRateStatus>(() => getPinRateStatus())
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // Countdown interval when blocked
  useEffect(() => {
    if (!status.blocked) return
    const id = setInterval(() => {
      const next = getPinRateStatus()
      setStatus(next)
      if (!next.blocked) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [status.blocked])

  useEffect(() => {
    if (!status.blocked) {
      refs[0].current?.focus()
    }
  }, [status.blocked])

  function handleChange(idx: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = digit
    setDigits(next)
    setError('')

    if (digit && idx < 3) {
      refs[idx + 1].current?.focus()
    }

    if (next.every((d) => d !== '') && digit) {
      validatePin(next.join(''))
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus()
    }
  }

  function validatePin(pin: string) {
    const stored = localStorage.getItem('desk_imperial_pin')
    if (!stored) {
      recordPinSuccess()
      onConfirm()
      return
    }
    if (pin === stored) {
      recordPinSuccess()
      onConfirm()
    } else {
      const next = recordPinFailure()
      setStatus(next)
      if (next.blocked) {
        setError('')
      } else {
        setError(`PIN incorreto. ${next.attemptsLeft} tentativa${next.attemptsLeft === 1 ? '' : 's'} restante${next.attemptsLeft === 1 ? '' : 's'}.`)
      }
      setDigits(['', '', '', ''])
      if (!next.blocked) {
        setTimeout(() => refs[0].current?.focus(), 50)
      }
    }
  }

  const filled = digits.filter((d) => d !== '').length
  const isBlocked = status.blocked

  function formatCountdown(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div
        className="imperial-card relative w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.08)] text-[var(--text-soft)] hover:text-white"
          type="button"
          onClick={onCancel}
        >
          <X className="size-3.5" />
        </button>

        <div className="p-6 text-center">
          <span className={`mx-auto flex size-14 items-center justify-center rounded-[20px] border ${isBlocked ? 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] text-red-400' : 'border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]'}`}>
            {isBlocked ? <ShieldAlert className="size-6" /> : <LockKeyhole className="size-6" />}
          </span>
          <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-[var(--text-soft)]">{description}</p>
        </div>

        {isBlocked ? (
          <div className="px-6 pb-8 text-center">
            <div className="rounded-[14px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] px-4 py-5">
              <p className="text-sm font-semibold text-[#fca5a5]">Acesso bloqueado</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">Muitas tentativas incorretas.</p>
              <p className="mt-4 text-3xl font-bold tabular-nums text-white">
                {formatCountdown(status.secondsLeft)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">Aguarde para tentar novamente</p>
            </div>
          </div>
        ) : (
          <>
            {/* PIN inputs */}
            <div className="flex justify-center gap-3 px-6 pb-2">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={refs[idx]}
                  className="size-14 rounded-[16px] border text-center text-xl font-bold text-white outline-none transition-all"
                  inputMode="numeric"
                  maxLength={1}
                  pattern="[0-9]"
                  style={{
                    background: digit ? 'rgba(52,242,127,0.08)' : 'rgba(255,255,255,0.03)',
                    borderColor: error
                      ? 'rgba(239,68,68,0.5)'
                      : digit
                        ? 'rgba(52,242,127,0.4)'
                        : 'rgba(255,255,255,0.1)',
                  }}
                  type="password"
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                />
              ))}
            </div>

            <div className="px-6 pb-6 pt-3">
              {error && (
                <p className="mb-3 text-center text-sm font-medium text-[#fca5a5]">{error}</p>
              )}

              <div className="flex h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                <div
                  className="h-full rounded-full bg-[#36f57c] transition-all duration-200"
                  style={{ width: `${(filled / 4) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-center text-xs text-[var(--text-soft)]">
                {filled}/4 dígitos
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
