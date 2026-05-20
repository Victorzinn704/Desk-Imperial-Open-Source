import { getLastDigit } from '@/lib/pin-input'
import { Button } from '@/components/shared/button'

export function PinSetupForm({
  pinDigits,
  setPinDigits,
  pinSaving,
  pinSaveError,
  setPinSaveError,
  pinSaved,
  onSave,
}: Readonly<{
  pinDigits: string[]
  setPinDigits: (v: string[]) => void
  pinSaving: boolean
  pinSaveError: string
  setPinSaveError: (v: string) => void
  pinSaved: boolean
  onSave: () => void
}>) {
  return (
    <div className="mt-5 space-y-3">
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
          Defina o PIN
        </legend>
        <div className="mt-3 flex gap-2">
          {pinDigits.map((digit, index) => (
            <input
              aria-label={`Digito ${index + 1} do PIN`}
              className="size-12 rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] text-center text-lg font-bold text-[var(--text-primary)] outline-none focus:border-[rgba(0,140,255,0.45)] [appearance:textfield]"
              disabled={pinSaving}
              inputMode="numeric"
              key={index}
              maxLength={1}
              type="password"
              value={digit}
              onChange={(event) => {
                const value = getLastDigit(event.target.value)
                const next = [...pinDigits]
                next[index] = value
                setPinDigits(next)
                setPinSaveError('')
              }}
            />
          ))}
        </div>
      </fieldset>
      {pinSaveError ? <p className="text-xs text-[#fca5a5]">{pinSaveError}</p> : null}
      <Button disabled={pinDigits.join('').length !== 4} loading={pinSaving} type="button" onClick={onSave}>
        {pinSaved ? 'PIN ativado' : 'Ativar PIN'}
      </Button>
    </div>
  )
}
