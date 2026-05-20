import { ShieldAlert } from 'lucide-react'
import { formatCountdown } from './pin-setup-card.model'
import type { PinSetupCardController } from './use-pin-setup-card-controller'

const confirmDigitKeys = ['confirm-pin-0', 'confirm-pin-1', 'confirm-pin-2', 'confirm-pin-3']

type PinRemoveConfirmationProps = Readonly<{
  controller: PinSetupCardController
}>

export function PinRemoveConfirmation({ controller }: PinRemoveConfirmationProps) {
  const {
    cancelRemoveConfirmation,
    confirmRemoveDigits,
    confirmRemoveError,
    handleConfirmRemoveDigitChange,
    removeBlocked,
    removeInputRefs,
    removeSecondsLeft,
    removing,
  } = controller

  return (
    <div className="rounded-[16px] border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.05)] p-4">
      <p className="text-sm font-semibold text-[var(--text-primary)]">Confirme o PIN atual para desativar</p>

      {removeBlocked ? (
        <div className="mt-4 rounded-[14px] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] px-4 py-4 text-center">
          <ShieldAlert className="mx-auto mb-2 size-5 text-[#fca5a5]" />
          <p className="text-sm font-semibold text-[#fca5a5]">Tentativas bloqueadas</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{formatCountdown(removeSecondsLeft)}</p>
        </div>
      ) : (
        <>
          <fieldset>
            <legend className="sr-only">Confirmar PIN atual</legend>
            <div className="mt-4 flex gap-2">
              {confirmRemoveDigits.map((digit, index) => (
                <input
                  aria-label={`Confirmacao do digito ${index + 1}`}
                  className="size-12 rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] text-center text-lg font-bold text-[var(--text-primary)] outline-none focus:border-[rgba(239,68,68,0.35)] [appearance:textfield]"
                  disabled={removing}
                  inputMode="numeric"
                  key={confirmDigitKeys[index]}
                  maxLength={1}
                  ref={removeInputRefs[index]}
                  type="password"
                  value={digit}
                  onChange={(event) => void handleConfirmRemoveDigitChange(index, event.target.value)}
                />
              ))}
            </div>
          </fieldset>
          {confirmRemoveError ? <p className="mt-3 text-xs text-[#fca5a5]">{confirmRemoveError}</p> : null}
        </>
      )}

      <button
        className="mt-4 text-xs text-[var(--text-soft)] underline transition hover:text-[var(--text-primary)]"
        type="button"
        onClick={cancelRemoveConfirmation}
      >
        Cancelar
      </button>
    </div>
  )
}
