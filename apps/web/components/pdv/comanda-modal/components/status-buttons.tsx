'use client'

import { memo } from 'react'
import type { Comanda } from '../../pdv-types'
import { STATUS_OPTIONS } from '../types'

type StatusButtonsProps = {
  comanda: Comanda
  isBusy: boolean
  onStatusChange: (comanda: Comanda, status: Comanda['status']) => Promise<void>
  onClose: () => void
  requirePin: (action: () => void, title: string, description: string) => void
}

export const StatusButtons = memo(function StatusButtons({
  comanda,
  isBusy,
  onStatusChange,
  onClose,
  requirePin,
}: StatusButtonsProps) {
  const isEnded = comanda.status === 'fechada' || comanda.status === 'cancelada'
  if (isEnded) {
    return null
  }

  return (
    <div className="grid grid-cols-2 gap-2 px-4 pb-3">
      {STATUS_OPTIONS.filter((option) => option.value !== comanda.status).map((option) => (
        <button
          className="rounded-[12px] border px-3 py-2 text-xs font-semibold transition-all hover:opacity-90"
          disabled={isBusy}
          key={option.value}
          style={{
            borderColor: `${option.color}44`,
            background: `${option.color}11`,
            color: option.color,
          }}
          type="button"
          onClick={() => {
            const requiresPinCheck = option.value === 'fechada' || option.value === 'cancelada'
            if (requiresPinCheck) {
              const title = option.value === 'cancelada' ? 'Cancelar Comanda' : 'Fechar Comanda'
              const description =
                option.value === 'cancelada'
                  ? 'Confirme com seu PIN para cancelar esta comanda e tirá-la do fluxo operacional.'
                  : 'Confirme com seu PIN para fechar completamente esta comanda.'
              requirePin(
                async () => {
                  await onStatusChange(comanda, option.value)
                  onClose()
                },
                title,
                description,
              )
            } else {
              void (async () => {
                await onStatusChange(comanda, option.value)
                onClose()
              })()
            }
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
})
