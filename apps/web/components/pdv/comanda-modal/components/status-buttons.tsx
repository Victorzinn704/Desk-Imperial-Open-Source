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
  return (
    <div className="grid grid-cols-2 gap-2 px-4 pb-3">
      {STATUS_OPTIONS.filter((option) => option.value !== comanda.status).map((option) => (
        <button
          key={option.value}
          className="rounded-[12px] border px-3 py-2 text-xs font-semibold transition-all hover:opacity-90"
          style={{
            borderColor: `${option.color}44`,
            background: `${option.color}11`,
            color: option.color,
          }}
          type="button"
          disabled={isBusy}
          onClick={() => {
            const requiresPinCheck = option.value === 'fechada'
            if (requiresPinCheck) {
              requirePin(
                async () => {
                  await onStatusChange(comanda, option.value)
                  onClose()
                },
                'Fechar Comanda',
                'Confirme com seu PIN para fechar completamente esta comanda.',
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
