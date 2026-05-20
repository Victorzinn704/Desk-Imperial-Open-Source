import { setupAdminPin } from '@/lib/admin-pin'
import { type ActivityFeedEntry, ApiError } from '@/lib/api'

export function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return minutes > 0 ? `${minutes}:${String(remainingSeconds).padStart(2, '0')}` : `${remainingSeconds}s`
}

export function formatActivityTitle(entry: ActivityFeedEntry) {
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

export function formatActivityDescription(entry: ActivityFeedEntry) {
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

export async function savePinAction(
  pinDigits: string[],
  setPinSaving: (v: boolean) => void,
  setPinSaveError: (v: string) => void,
  setPinSaved: (v: boolean) => void,
  setPinActive: (v: boolean) => void,
  setPinDigits: (v: string[]) => void,
) {
  const pin = pinDigits.join('')
  if (pin.length !== 4) {
    return
  }

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
