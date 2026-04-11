'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react'
import { type ActivityFeedEntry, ApiError } from '@/lib/api'
import { removeAdminPin, setupAdminPin } from '@/lib/admin-pin'
import { cn } from '@/lib/utils'
import { Button } from '@/components/shared/button'

type PinSetupCardProps = Readonly<{
  activity: ActivityFeedEntry[]
  activityError: string | null
  activityLoading: boolean
}>

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return minutes > 0 ? `${minutes}:${String(remainingSeconds).padStart(2, '0')}` : `${remainingSeconds}s`
}

function RecentAccessSummary({
  activity,
  activityError,
  activityLoading,
}: Readonly<{
  activity: ActivityFeedEntry[]
  activityError: string | null
  activityLoading: boolean
}>) {
  if (activityLoading) {
    return <p className="mt-3 text-sm text-[var(--text-soft)]">Carregando histórico recente...</p>
  }

  if (activityError) {
    return <p className="mt-3 text-sm text-[var(--danger)]">{activityError}</p>
  }

  const latest = activity[0]
  if (!latest) {
    return <p className="mt-3 text-sm text-[var(--text-soft)]">Ainda não há acessos suficientes para leitura.</p>
  }

  return (
    <div className="mt-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{formatActivityTitle(latest)}</p>
      <p className="mt-1 text-xs text-[var(--text-soft)]">
        {new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(latest.createdAt))}
        {' · '}
        {formatActivityDescription(latest)}
      </p>
    </div>
  )
}

function formatActivityTitle(entry: ActivityFeedEntry) {
  const actorName = entry.actorName ?? 'Sistema'

  if (entry.event === 'auth.login.succeeded') {
    return `${actorName} iniciou uma sessão`
  }

  if (entry.event.startsWith('operations.cash_')) {
    return `${actorName} movimentou o caixa`
  }

  if (entry.event.startsWith('operations.comanda')) {
    return `${actorName} atualizou uma comanda`
  }

  if (entry.event.startsWith('employee.')) {
    return `${actorName} alterou a equipe`
  }

  if (entry.event === 'order.cancelled') {
    return `${actorName} cancelou um pedido`
  }

  if (entry.event.startsWith('order.')) {
    return `${actorName} registrou um pedido`
  }

  return `${actorName} gerou atividade`
}

function formatActivityDescription(entry: ActivityFeedEntry) {
  if (entry.event === 'auth.login.succeeded') {
    return 'Acesso autenticado no portal'
  }

  if (entry.event.startsWith('operations.cash_')) {
    return 'Fluxo operacional de caixa'
  }

  if (entry.event.startsWith('operations.comanda')) {
    return 'Movimento operacional do salão'
  }

  if (entry.event.startsWith('employee.')) {
    return 'Gestão de vínculo e acesso'
  }

  if (entry.event.startsWith('order.')) {
    return 'Registro comercial auditado'
  }

  return entry.resource ? `${entry.resource} · ${entry.event}` : entry.event
}

function PinSetupForm({
  pinDigits,
  setPinDigits,
  pinSaving,
  pinSaveError,
  setPinSaveError,
  pinSaved,
  onSave,
}: {
  pinDigits: string[]
  setPinDigits: (v: string[]) => void
  pinSaving: boolean
  pinSaveError: string
  setPinSaveError: (v: string) => void
  pinSaved: boolean
  onSave: () => void
}) {
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
                const value = event.target.value.replace(/\D/g, '').slice(-1)
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

async function savePinAction(
  pinDigits: string[],
  setPinSaving: (v: boolean) => void,
  setPinSaveError: (v: string) => void,
  setPinSaved: (v: boolean) => void,
  setPinActive: (v: boolean) => void,
  setPinDigits: (v: string[]) => void,
) {
  const pin = pinDigits.join('')
  if (pin.length !== 4) {return}

  setPinSaving(true)
  setPinSaveError('')

  try {
    await setupAdminPin(pin)
    setPinSaved(true)
    setPinActive(true)
    setPinDigits(['', '', '', ''])
    globalThis.setTimeout(() => setPinSaved(false), 2600)
  } catch (error) {
    setPinSaveError(error instanceof ApiError ? error.message : 'Nao foi possivel ativar o PIN agora.')
  } finally {
    setPinSaving(false)
  }
}

export function PinSetupCard({ activity, activityError, activityLoading }: PinSetupCardProps) {
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [pinSaved, setPinSaved] = useState(false)
  const [pinSaving, setPinSaving] = useState(false)
  const [pinSaveError, setPinSaveError] = useState('')
  const [pinActive, setPinActive] = useState(false)
  const [showConfirmRemove, setShowConfirmRemove] = useState(false)
  const [confirmRemoveDigits, setConfirmRemoveDigits] = useState(['', '', '', ''])
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

  function handleRemoveError(error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 423) {
        const match = error.message.match(/(\d+)\s*s/i)
        setRemoveBlocked(true)
        setRemoveSecondsLeft(match ? Number(match[1]) : 300)
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
      setConfirmRemoveDigits(['', '', '', ''])
      setConfirmRemoveError('')
    } catch (error) {
      setConfirmRemoveDigits(['', '', '', ''])
      handleRemoveError(error)
    } finally {
      setRemoving(false)
    }
  }

  async function handleConfirmRemoveDigitChange(index: number, rawValue: string) {
    const value = rawValue.replace(/\D/g, '').slice(-1)
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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <article className="imperial-card p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <KeyRound className="size-5" />
          </span>
          <div>
            <p className="text-sm text-[var(--text-soft)]">PIN administrativo</p>
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Controle fino das ações sensíveis</h3>
          </div>
        </div>

        <div className="mt-6 rounded-[20px] border border-[rgba(52,242,127,0.14)] bg-[rgba(52,242,127,0.04)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Estado atual</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                {pinActive
                  ? 'O fluxo sensível do PDV está protegido por confirmação administrativa.'
                  : 'Ative o PIN para endurecer desconto, exclusão e ações críticas do ambiente.'}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                pinActive
                  ? 'border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#8fffb9]'
                  : 'border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)]',
              )}
            >
              <ShieldCheck className="size-3" />
              {pinActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          {!pinActive ? (
            <PinSetupForm
              pinDigits={pinDigits}
              pinSaveError={pinSaveError}
              pinSaved={pinSaved}
              pinSaving={pinSaving}
              setPinDigits={setPinDigits}
              setPinSaveError={setPinSaveError}
              onSave={() => void handleSavePin()}
            />
          ) : (
            <div className="mt-5 space-y-3">
              {!showConfirmRemove ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-[var(--text-soft)]">
                    O PIN está valendo para o fluxo sensível do workspace.
                  </p>
                  <button
                    className="rounded-[12px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3 py-2 text-xs font-semibold text-[#fca5a5] transition hover:bg-[rgba(239,68,68,0.14)]"
                    type="button"
                    onClick={() => {
                      setShowConfirmRemove(true)
                      setConfirmRemoveDigits(['', '', '', ''])
                      setConfirmRemoveError('')
                      setRemoveBlocked(false)
                    }}
                  >
                    Remover PIN
                  </button>
                </div>
              ) : (
                <div className="rounded-[16px] border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.05)] p-4">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Confirme o PIN atual para desativar
                  </p>

                  {removeBlocked ? (
                    <div className="mt-4 rounded-[14px] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] px-4 py-4 text-center">
                      <ShieldAlert className="mx-auto mb-2 size-5 text-[#fca5a5]" />
                      <p className="text-sm font-semibold text-[#fca5a5]">Tentativas bloqueadas</p>
                      <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                        {formatCountdown(removeSecondsLeft)}
                      </p>
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
                              key={index}
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
                    onClick={() => {
                      setShowConfirmRemove(false)
                      setConfirmRemoveDigits(['', '', '', ''])
                      setConfirmRemoveError('')
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </article>

      <article className="imperial-card p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Recuperação e revisão</p>
        <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Fluxo seguro da conta principal</h3>
        <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
          A troca definitiva de senha continua via validação segura por email enquanto o painel administrativo interno é
          endurecido.
        </p>

        <div className="mt-6">
          <Link href="/recuperar-senha">
            <Button fullWidth type="button" variant="secondary">
              Abrir recuperação por email
            </Button>
          </Link>
        </div>

        <div className="mt-6 border-t border-[var(--border)] pt-6">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Leitura recente</p>
          <RecentAccessSummary activity={activity} activityError={activityError} activityLoading={activityLoading} />
        </div>
      </article>
    </div>
  )
}
