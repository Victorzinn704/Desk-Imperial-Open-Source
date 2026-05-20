'use client'

import { forwardRef, memo } from 'react'
import { useMobileComandaCardController } from './mobile-comanda-card.controller'
import { MobileComandaCardExpandedContent } from './mobile-comanda-card.expanded-content'
import { MobileComandaCardHeader, MobileComandaCardMeta } from './mobile-comanda-card.header'
import type { MobileComandaCardProps } from './mobile-comanda-list.types'

export const MobileComandaCard = memo(
  // eslint-disable-next-line max-lines-per-function
  forwardRef<HTMLLIElement, MobileComandaCardProps>(function MobileComandaCard(props, ref) {
    const {
      comanda,
      currentEmployeeId = null,
      isFocused,
      isBusy = false,
      onAddItems,
      onCancelComanda,
      onCloseComanda,
      onCreatePayment,
      onFocus,
      onUpdateStatus,
    } = props
    const controller = useMobileComandaCardController({ comanda, currentEmployeeId, isFocused, onCreatePayment })

    return (
      <li
        className="group relative overflow-hidden rounded-[20px] transition-all duration-300"
        ref={ref}
        style={buildCardSurface({ chipColor: controller.config.chipColor, isFocused })}
      >
        {!isFocused && onFocus ? (
          <CardFocusOverlay
            comandaId={comanda.id}
            mesaLabel={controller.activeComanda.mesa ?? 'comanda'}
            onFocus={onFocus}
          />
        ) : null}
        {isFocused ? <CardFocusedGlow chipColor={controller.config.chipColor} /> : null}
        <div className="relative z-20 p-4 sm:p-5">
          <MobileComandaCardHeader
            config={controller.config}
            isFocused={isFocused}
            isOwnedByCurrentEmployee={controller.isOwnedByCurrentEmployee}
            itemCount={controller.itemCount}
            mesaLabel={controller.activeComanda.mesa ?? 'Comanda'}
            primaryWaiterName={controller.primaryWaiterName}
            total={controller.total}
            onCollapse={isFocused ? () => onFocus?.(null) : undefined}
          />
          <MobileComandaCardMeta clientName={controller.activeComanda.clienteNome} elapsed={controller.elapsed} />
          {isFocused ? (
            <MobileComandaCardExpandedContent
              controller={controller}
              isBusy={isBusy}
              onAddItems={onAddItems}
              onCancelComanda={onCancelComanda}
              onCloseComanda={onCloseComanda}
              onCreatePayment={onCreatePayment}
              onUpdateStatus={onUpdateStatus}
            />
          ) : null}
        </div>
      </li>
    )
  }),
)

function CardFocusOverlay({
  comandaId,
  mesaLabel,
  onFocus,
}: Readonly<{
  comandaId: string
  mesaLabel: string
  onFocus: NonNullable<MobileComandaCardProps['onFocus']>
}>) {
  return (
    <button
      aria-label={`Abrir detalhes da ${mesaLabel}`}
      className="absolute inset-0 z-10 cursor-pointer border-0 bg-transparent p-0"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      type="button"
      onClick={() => onFocus(comandaId)}
    />
  )
}

function CardFocusedGlow({
  chipColor,
}: Readonly<{
  chipColor: string
}>) {
  return (
    <div
      className="pointer-events-none absolute -right-[20%] -top-[50%] size-[150%] rounded-full opacity-[0.08] blur-3xl transition-opacity"
      style={{ background: `radial-gradient(circle, ${chipColor} 0%, transparent 70%)` }}
    />
  )
}

function buildCardSurface({
  chipColor,
  isFocused,
}: Readonly<{
  chipColor: string
  isFocused: boolean
}>) {
  return {
    background: isFocused ? 'var(--surface-muted)' : 'var(--surface)',
    border: `1px solid ${isFocused ? `${chipColor}55` : 'var(--border)'}`,
    boxShadow: isFocused ? `0 0 24px ${chipColor}15` : undefined,
    backdropFilter: isFocused ? 'blur(16px)' : 'blur(8px)',
  }
}
