'use client'

import { useRef, useState, useEffect } from 'react'
import { LockKeyhole, X } from 'lucide-react'

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
  const [attempts, setAttempts] = useState(0)
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => {
    refs[0].current?.focus()
  }, [])

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
      const pin = next.join('')
      validatePin(pin, next)
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus()
    }
  }

  function validatePin(pin: string, currentDigits: string[]) {
    const stored = localStorage.getItem('desk_imperial_pin')
    if (!stored) {
      onConfirm()
      return
    }
    if (pin === stored) {
      onConfirm()
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      setError(newAttempts >= 3 ? 'Muitas tentativas. Tente novamente mais tarde.' : 'PIN incorreto.')
      setDigits(['', '', '', ''])
      setTimeout(() => refs[0].current?.focus(), 50)
    }
  }

  const filled = digits.filter((d) => d !== '').length

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
          <span className="mx-auto flex size-14 items-center justify-center rounded-[20px] border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <LockKeyhole className="size-6" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-[var(--text-soft)]">{description}</p>
        </div>

        {/* PIN inputs */}
        <div className="flex justify-center gap-3 px-6 pb-2">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={refs[idx]}
              className="size-14 rounded-[16px] border text-center text-xl font-bold text-white outline-none transition-all"
              disabled={attempts >= 3}
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
      </div>
    </div>
  )
}
