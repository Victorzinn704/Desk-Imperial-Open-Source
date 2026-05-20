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
  if (isComandaEnded(comanda)) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-2 px-4 pb-3 min-[430px]:grid-cols-2">
      {STATUS_OPTIONS.filter((option) => option.value !== comanda.status).map((option) => (
        <StatusActionButton
          comanda={comanda}
          disabled={isBusy}
          key={option.value}
          option={option}
          requirePin={requirePin}
          onClose={onClose}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  )
})

type StatusOption = (typeof STATUS_OPTIONS)[number]

function StatusActionButton({
  comanda,
  disabled,
  onClose,
  onStatusChange,
  option,
  requirePin,
}: Readonly<{
  comanda: Comanda
  disabled: boolean
  onClose: () => void
  onStatusChange: (comanda: Comanda, status: Comanda['status']) => Promise<void>
  option: StatusOption
  requirePin: (action: () => void, title: string, description: string) => void
}>) {
  return (
    <button
      className="min-h-11 rounded-[12px] border px-3 py-2 text-xs font-semibold transition-all hover:opacity-90"
      disabled={disabled}
      style={buildStatusButtonStyle(option)}
      type="button"
      onClick={() => handleStatusChange({ comanda, onClose, onStatusChange, option, requirePin })}
    >
      {option.label}
    </button>
  )
}

function isComandaEnded(comanda: Comanda) {
  return comanda.status === 'fechada' || comanda.status === 'cancelada'
}

function buildStatusButtonStyle(option: StatusOption) {
  return {
    background: `${option.color}11`,
    borderColor: `${option.color}44`,
    color: option.color,
  }
}

function handleStatusChange({
  comanda,
  onClose,
  onStatusChange,
  option,
  requirePin,
}: Readonly<{
  comanda: Comanda
  onClose: () => void
  onStatusChange: (comanda: Comanda, status: Comanda['status']) => Promise<void>
  option: StatusOption
  requirePin: (action: () => void, title: string, description: string) => void
}>) {
  if (!requiresPinCheck(option)) {
    void changeStatusAndClose({ comanda, onClose, onStatusChange, option })
    return
  }

  const confirmation = buildStatusConfirmation(option)
  requirePin(
    () => void changeStatusAndClose({ comanda, onClose, onStatusChange, option }),
    confirmation.title,
    confirmation.description,
  )
}

function requiresPinCheck(option: StatusOption) {
  return option.value === 'fechada' || option.value === 'cancelada'
}

async function changeStatusAndClose({
  comanda,
  onClose,
  onStatusChange,
  option,
}: Readonly<{
  comanda: Comanda
  onClose: () => void
  onStatusChange: (comanda: Comanda, status: Comanda['status']) => Promise<void>
  option: StatusOption
}>) {
  await onStatusChange(comanda, option.value)
  onClose()
}

function buildStatusConfirmation(option: StatusOption) {
  if (option.value === 'cancelada') {
    return {
      description: 'Confirme com seu PIN para cancelar esta comanda e tirá-la do fluxo operacional.',
      title: 'Cancelar Comanda',
    }
  }

  return {
    description: 'Confirme com seu PIN para fechar completamente esta comanda.',
    title: 'Fechar Comanda',
  }
}
