import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Mesa } from '@/components/pdv/pdv-types'
import { OwnerPdvTab } from './owner-mobile-pdv-tab'

vi.mock('next/dynamic', () => {
  let callIndex = 0

  return {
    default: () => {
      callIndex += 1

      if (callIndex === 1) {
        return function MockKitchenOrdersView(props: { queryKey: readonly unknown[] }) {
          return <div data-testid="mock-kitchen-orders-view">{props.queryKey.join(':')}</div>
        }
      }

      return function MockMobileOrderBuilder(props: {
        checkoutDockOffset?: 'navigation' | 'screen'
        mesaLabel: string
        mode: 'add' | 'new'
        onCancel: () => void
        onSubmit: (items: []) => void
        secondaryAction: { label: string; onClick: () => void }
      }) {
        return (
          <div data-testid="mock-mobile-order-builder">
            <div>{props.mesaLabel}</div>
            <div>{props.mode}</div>
            <div>{props.checkoutDockOffset}</div>
            <button type="button" onClick={props.secondaryAction.onClick}>
              {props.secondaryAction.label}
            </button>
            <button type="button" onClick={props.onCancel}>
              Cancelar builder
            </button>
            <button type="button" onClick={() => props.onSubmit([])}>
              Enviar builder
            </button>
          </div>
        )
      }
    },
  }
})

describe('OwnerPdvTab', () => {
  it('mostra a visão geral de mesas e alterna para cozinha', () => {
    const onSetPdvView = vi.fn()
    const mesaLivre: Mesa = {
      capacidade: 4,
      id: 'mesa-1',
      numero: '1',
      status: 'livre',
    }

    render(
      <OwnerPdvTab
        errorMessage={null}
        isBusy={false}
        isOffline={false}
        kitchenData={{
          businessDate: '2026-04-21',
          companyOwnerId: 'owner-1',
          items: [],
          statusCounts: { queued: 2, inPreparation: 1, ready: 0 },
        }}
        kitchenLoading={false}
        mesas={[mesaLivre]}
        mesasLoading={false}
        pdvView="mesas"
        pendingAction={null}
        products={[]}
        productsErrorMessage={null}
        productsLoading={false}
        onCancelBuilder={() => undefined}
        onOpenQuickRegister={() => undefined}
        onSelectMesa={() => undefined}
        onSetPdvView={onSetPdvView}
        onSubmit={() => undefined}
      />,
    )

    expect(screen.getByText('Pedido e cozinha')).toBeInTheDocument()
    expect(screen.getByTestId('mesa-summary-livres')).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: /Cadastro rápido/i })).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('owner-pdv-cozinha'))

    expect(onSetPdvView).toHaveBeenCalledWith('cozinha')
  })

  it('abre o builder com contexto correto e mantém as ações de apoio', () => {
    const onCancelBuilder = vi.fn()
    const onOpenQuickRegister = vi.fn()
    const onSubmit = vi.fn()

    render(
      <OwnerPdvTab
        errorMessage={null}
        isBusy={false}
        isOffline={false}
        kitchenData={undefined}
        kitchenLoading={false}
        mesas={[]}
        mesasLoading={false}
        pdvView="mesas"
        pendingAction={{ mesaLabel: 'Mesa 12', comandaId: 'cmd-12', type: 'add' }}
        products={[]}
        productsErrorMessage={null}
        productsLoading={false}
        onCancelBuilder={onCancelBuilder}
        onOpenQuickRegister={onOpenQuickRegister}
        onSelectMesa={() => undefined}
        onSetPdvView={() => undefined}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByTestId('mock-mobile-order-builder')).toBeInTheDocument()
    expect(screen.getByText('Mesa 12')).toBeInTheDocument()
    expect(screen.getByText('add')).toBeInTheDocument()
    expect(screen.getByText('screen')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cadastro rápido' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar builder' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar builder' }))

    expect(onOpenQuickRegister).toHaveBeenCalledTimes(1)
    expect(onCancelBuilder).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
