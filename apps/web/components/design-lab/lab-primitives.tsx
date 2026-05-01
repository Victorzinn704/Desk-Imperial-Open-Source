import { createElement, isValidElement, type ComponentPropsWithoutRef, type HTMLAttributes, type ReactNode } from 'react'
import { X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LabStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

type LabHeaderMetaSlot = ReactNode

export type LabPageHeaderProps = {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  meta?: LabHeaderMetaSlot
  metaContainerClassName?: string
  actions?: ReactNode
  tabs?: ReactNode
  children?: ReactNode
  className?: string
  asideClassName?: string
}

type LabPanelPadding = 'none' | 'sm' | 'md' | 'lg'

export type LabPanelProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  padding?: LabPanelPadding
  elevated?: boolean
  headerClassName?: string
  contentClassName?: string
}

export type LabMetricProps = {
  label: ReactNode
  value: ReactNode
  icon?: LucideIcon
  delta?: ReactNode
  deltaTone?: LabStatusTone
  hint?: ReactNode
  progress?: number | string
  footer?: ReactNode
  className?: string
}

export type LabTableColumn<Row> = {
  id: string
  header: ReactNode
  cell: (row: Row, index: number) => ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
  className?: string
  headerClassName?: string
}

export type LabTableProps<Row> = {
  columns: Array<LabTableColumn<Row>>
  rows: Row[]
  rowKey: keyof Row | ((row: Row, index: number) => string | number)
  dense?: boolean
  className?: string
  tableClassName?: string
  rowClassName?: (row: Row, index: number) => string | undefined
  emptyTitle?: ReactNode
  emptyDescription?: ReactNode
  emptyAction?: ReactNode
}

export type LabEmptyStateProps = {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode | LucideIcon
  action?: ReactNode
  compact?: boolean
  className?: string
}

export type LabStatusPillProps = ComponentPropsWithoutRef<'span'> & {
  tone?: LabStatusTone
  size?: 'sm' | 'md'
  icon?: ReactNode
}

export type LabMiniStatProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode
  value: ReactNode
  description?: ReactNode
}

export type LabMetricStripProps = HTMLAttributes<HTMLDivElement> & {
  columnsClassName?: string
}

export type LabMetricStripItemProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode
  value: ReactNode
  description?: ReactNode
}

export type LabSignalRowProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode
  value: ReactNode
  note?: ReactNode
  tone?: LabStatusTone
  valueSize?: 'sm' | 'md'
}

export type LabFactPillProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode
  value: ReactNode
}

export type LabFilterChipProps = ComponentPropsWithoutRef<'button'> & {
  active?: boolean
  count?: ReactNode
  label: ReactNode
}

export type LabModalProps = {
  open: boolean
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onClose?: () => void
  closeLabel?: string
  className?: string
}

const panelPaddingClass: Record<LabPanelPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

const pillToneClass: Record<LabStatusTone, string> = {
  neutral: 'border-[var(--lab-border)] bg-[var(--lab-surface-hover)] text-[var(--lab-fg-soft)]',
  info: 'border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] text-[var(--lab-blue)]',
  success: 'border-[color:var(--lab-success-soft)] bg-[var(--lab-success-soft)] text-[var(--lab-success)]',
  warning: 'border-[color:var(--lab-warning-soft)] bg-[var(--lab-warning-soft)] text-[var(--lab-warning)]',
  danger: 'border-[color:var(--lab-danger-soft)] bg-[var(--lab-danger-soft)] text-[var(--lab-danger)]',
}

const pillSizeClass = {
  sm: 'gap-1 px-2 py-0.5 text-[11px]',
  md: 'gap-1.5 px-2.5 py-1 text-xs',
}

const modalSizeClass = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
}

export const LAB_RESPONSIVE_FOUR_UP_GRID = 'sm:grid-cols-2 2xl:grid-cols-4'
export const LAB_NUMERIC_HERO_CLASS =
  'max-w-full overflow-hidden whitespace-nowrap text-[clamp(2rem,3.2vw,3rem)] font-bold leading-[0.92] tracking-[-0.05em] tabular-nums'
export const LAB_NUMERIC_SECTION_CLASS =
  'max-w-full overflow-hidden whitespace-nowrap text-[clamp(1.55rem,2.2vw,2.2rem)] font-semibold leading-[0.92] tracking-[-0.04em] tabular-nums'
export const LAB_NUMERIC_COMPACT_CLASS =
  'max-w-full overflow-hidden whitespace-nowrap text-[clamp(1.05rem,1.55vw,1.3rem)] font-semibold leading-tight tracking-[-0.02em] tabular-nums'

const tableAlignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

export function LabPageHeader({
  eyebrow,
  title,
  description,
  meta,
  metaContainerClassName,
  actions,
  tabs,
  children,
  className,
  asideClassName,
}: LabPageHeaderProps) {
  return (
    <header
      className={cn(
        'lab-page-header space-y-4 border-b border-[var(--lab-border)] pb-4',
        className,
      )}
    >
      <div className="lab-page-header__main flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="lab-page-header__content min-w-0 flex-1 space-y-3">
          {eyebrow ? (
            <p className="lab-page-header__eyebrow text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">{eyebrow}</p>
          ) : null}
          <div className="lab-page-header__title-block space-y-1">
            <h1 className="lab-page-header__title text-3xl font-semibold text-[var(--lab-fg)] sm:text-4xl">{title}</h1>
            {description ? (
              <p className="lab-page-header__description max-w-2xl text-sm leading-6 text-[var(--lab-fg-soft)]">{description}</p>
            ) : null}
          </div>
          {children ? <div className="lab-page-header__children pt-1">{children}</div> : null}
        </div>

        {(meta || actions) && (
          <div
            className={cn(
              'lab-page-header__aside flex w-full flex-col gap-3 xl:max-w-md xl:items-end',
              asideClassName,
            )}
          >
            {meta ? (
              <div
                className={cn(
                  'lab-page-header__meta w-full rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)] p-4 xl:max-w-sm',
                  metaContainerClassName,
                )}
              >
                {meta}
              </div>
            ) : null}
            {actions ? <div className="lab-page-header__actions flex flex-wrap items-center gap-2 xl:justify-end">{actions}</div> : null}
          </div>
        )}
      </div>

      {tabs ? <div className="lab-page-header__tabs flex flex-wrap items-center gap-2">{tabs}</div> : null}
    </header>
  )
}

export function LabPanel({
  title,
  subtitle,
  action,
  footer,
  padding = 'md',
  elevated = false,
  headerClassName,
  contentClassName,
  className,
  children,
  ...props
}: LabPanelProps) {
  const hasHeader = title || subtitle || action

  return (
    <section
      className={cn(
        'lab-panel overflow-hidden rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)]',
        elevated && 'bg-[var(--lab-surface-raised)]',
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <div
          className={cn(
            'lab-panel__header flex items-start justify-between gap-4 border-b border-[var(--lab-border)] px-5 py-3.5',
            headerClassName,
          )}
        >
          <div className="min-w-0 flex-1">
            {title ? <h2 className="lab-panel__title text-base font-semibold text-[var(--lab-fg)]">{title}</h2> : null}
            {subtitle ? <p className="lab-panel__subtitle mt-1 text-sm leading-6 text-[var(--lab-fg-soft)]">{subtitle}</p> : null}
          </div>
          {action ? <div className="lab-panel__action flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      ) : null}

      <div className={cn('lab-panel__body', panelPaddingClass[padding], contentClassName)}>{children}</div>

      {footer ? <div className="lab-panel__footer border-t border-[var(--lab-border)] px-5 py-4">{footer}</div> : null}
    </section>
  )
}

export function LabMetric({
  label,
  value,
  icon: Icon,
  delta,
  deltaTone = 'info',
  hint,
  progress,
  footer,
  className,
}: LabMetricProps) {
  const progressWidth =
    typeof progress === 'number' ? `${Math.max(0, Math.min(progress, 100))}%` : progress

  return (
    <LabPanel className={cn('lab-metric', className)} padding="md">
      <div className="lab-metric__header flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="lab-metric__lead flex items-center gap-3">
            {Icon ? (
              <span className="lab-metric__icon inline-flex size-11 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-blue)]">
                <Icon className="size-5" />
              </span>
            ) : null}
            <div className="lab-metric__copy min-w-0">
              <p className="lab-metric__label text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">{label}</p>
              <p className={cn('lab-metric__value mt-2 text-[var(--lab-fg)]', LAB_NUMERIC_SECTION_CLASS)}>
                {value}
              </p>
            </div>
          </div>
        </div>
        {delta ? (
          <LabStatusPill tone={deltaTone} size="md">
            {delta}
          </LabStatusPill>
        ) : null}
      </div>

      {hint ? <p className="lab-metric__hint mt-2 truncate text-[13px] leading-5 text-[var(--lab-fg-soft)]">{hint}</p> : null}

      {progressWidth ? (
        <div className="lab-metric__progress mt-4">
          <div className="lab-metric__progress-track h-2 overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
            <div className="lab-metric__progress-bar h-full rounded-full bg-[var(--lab-blue)]" style={{ width: progressWidth }} />
          </div>
          <div className="lab-metric__progress-meta mt-2 flex items-center justify-between gap-3 text-[11px] font-medium text-[var(--lab-fg-soft)]">
            <span>{progressWidth} concluído</span>
          </div>
        </div>
      ) : null}

      {footer ? <div className="lab-metric__footer mt-4">{footer}</div> : null}
    </LabPanel>
  )
}

export function LabTable<Row>({
  columns,
  rows,
  rowKey,
  dense = false,
  className,
  tableClassName,
  rowClassName,
  emptyTitle = 'Nada para mostrar',
  emptyDescription = 'Sem dados no recorte.',
  emptyAction,
}: LabTableProps<Row>) {
  if (rows.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-dashed border-[var(--lab-border)]', className)}>
        <LabEmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          compact
          className="border-0 bg-transparent"
        />
      </div>
    )
  }

  return (
    <div className={cn('lab-table overflow-x-auto rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)]', className)}>
      <table className={cn('lab-table__table min-w-full text-sm', tableClassName)}>
        <thead className="lab-table__head border-b border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-xs uppercase text-[var(--lab-fg-muted)]">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  'lab-table__head-cell px-4 font-medium',
                  dense ? 'py-2.5' : 'py-3',
                  tableAlignClass[column.align ?? 'left'],
                  column.headerClassName,
                )}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="lab-table__body divide-y divide-[var(--lab-border)]">
          {rows.map((row, index) => {
            const resolvedKey =
              typeof rowKey === 'function'
                ? rowKey(row, index)
                : String((row as Record<string, unknown>)[rowKey as string] ?? index)

            return (
              <tr
                key={resolvedKey}
                className={cn(
                  'lab-table__row text-[var(--lab-fg-soft)] transition hover:bg-[var(--lab-surface-hover)]',
                  rowClassName?.(row, index),
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      'lab-table__cell px-4 align-middle',
                      dense ? 'py-3' : 'py-4',
                      tableAlignClass[column.align ?? 'left'],
                      column.className,
                    )}
                  >
                    {column.cell(row, index)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function LabEmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
  className,
}: LabEmptyStateProps) {
  const lead = resolveLead(icon)

  return (
    <div
      className={cn(
        'lab-empty-state rounded-2xl border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface)]',
        compact ? 'px-5 py-8' : 'px-6 py-12',
        className,
      )}
    >
      <div className={cn('lab-empty-state__content mx-auto flex max-w-xl flex-col items-center text-center', compact ? 'gap-3' : 'gap-4')}>
        {lead ? (
          <span className="lab-empty-state__lead inline-flex size-12 items-center justify-center rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-blue)]">
            {lead}
          </span>
        ) : null}
        <div className="lab-empty-state__copy space-y-2">
          <h3 className="lab-empty-state__title text-lg font-semibold text-[var(--lab-fg)]">{title}</h3>
          {description ? <p className="lab-empty-state__description text-xs leading-5 text-[var(--lab-fg-soft)]">{description}</p> : null}
        </div>
        {action ? <div className="lab-empty-state__action pt-1">{action}</div> : null}
      </div>
    </div>
  )
}

export function LabStatusPill({
  tone = 'neutral',
  size = 'sm',
  icon,
  className,
  children,
  ...props
}: LabStatusPillProps) {
  return (
    <span
      className={cn(
        'lab-status-pill inline-flex items-center rounded-full border font-medium',
        pillToneClass[tone],
        pillSizeClass[size],
        className,
      )}
      {...props}
    >
      {icon ? <span className="lab-status-pill__icon shrink-0">{icon}</span> : null}
      <span className="lab-status-pill__text">{children}</span>
    </span>
  )
}

export function LabMiniStat({
  label,
  value,
  description,
  className,
  ...props
}: LabMiniStatProps) {
  return (
    <div
      className={cn(
        'lab-mini-stat rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4',
        className,
      )}
      {...props}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">{label}</p>
      <p className={cn('mt-2 text-[var(--lab-fg)]', LAB_NUMERIC_COMPACT_CLASS)}>
        {value}
      </p>
      {description ? <p className="mt-1 text-[13px] leading-5 text-[var(--lab-fg-soft)]">{description}</p> : null}
    </div>
  )
}

export function LabMetricStrip({
  columnsClassName,
  className,
  children,
  ...props
}: LabMetricStripProps) {
  return (
    <div
      className={cn(
        'lab-metric-strip grid gap-px overflow-hidden rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-border)]',
        LAB_RESPONSIVE_FOUR_UP_GRID,
        columnsClassName,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function LabMetricStripItem({
  label,
  value,
  description,
  className,
  ...props
}: LabMetricStripItemProps) {
  return (
    <div
      className={cn(
        'lab-metric-strip__item min-w-0 bg-[var(--lab-surface-raised)] px-4 py-4',
        className,
      )}
      {...props}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">{label}</p>
      <p className={cn('mt-2 text-[var(--lab-fg)]', LAB_NUMERIC_COMPACT_CLASS)}>
        {value}
      </p>
      {description ? <p className="mt-1 text-[13px] leading-5 text-[var(--lab-fg-soft)]">{description}</p> : null}
    </div>
  )
}

export function LabSignalRow({
  label,
  value,
  note,
  tone = 'neutral',
  valueSize = 'md',
  className,
  ...props
}: LabSignalRowProps) {
  return (
    <div
      className={cn(
        'lab-signal-row flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] py-4 last:border-b-0',
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">{label}</p>
        {note ? <p className="mt-1 text-[13px] leading-5 text-[var(--lab-fg-soft)]">{note}</p> : null}
      </div>
      <LabStatusPill size={valueSize} tone={tone}>
        {value}
      </LabStatusPill>
    </div>
  )
}

export function LabFactPill({
  label,
  value,
  className,
  ...props
}: LabFactPillProps) {
  return (
    <div
      className={cn(
        'lab-fact-pill inline-flex items-center gap-2 rounded-full border border-[var(--lab-border)] bg-[var(--lab-surface)] px-3 py-1.5 text-xs text-[var(--lab-fg-soft)]',
        className,
      )}
      {...props}
    >
      <span className="font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">{label}</span>
      <span className="font-medium text-[var(--lab-fg)]">{value}</span>
    </div>
  )
}

export function LabFilterChip({
  active = false,
  count,
  label,
  className,
  type = 'button',
  ...props
}: LabFilterChipProps) {
  return (
    <button
      className={cn(
        'lab-filter-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-60',
        active
          ? 'border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] text-[var(--lab-blue)]'
          : 'border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-fg-soft)] hover:bg-[var(--lab-surface-hover)] hover:text-[var(--lab-fg)]',
        className,
      )}
      type={type}
      {...props}
    >
      <span>{label}</span>
      {count != null ? <span className="font-semibold">{count}</span> : null}
    </button>
  )
}

export function LabModal({
  open,
  title,
  description,
  children,
  actions,
  size = 'md',
  onClose,
  closeLabel = 'Fechar modal',
  className,
}: LabModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="lab-modal fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6" role="presentation">
      {onClose ? (
        <button
          aria-label={closeLabel}
          className="lab-modal__backdrop absolute inset-0 border-0 p-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--lab-bg) 74%, transparent)' }}
          type="button"
          onClick={onClose}
        />
      ) : (
        <div
          className="lab-modal__backdrop absolute inset-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--lab-bg) 74%, transparent)' }}
        />
      )}
      <div
        className={cn(
          'lab-modal__dialog relative z-[1] w-full rounded-[28px] border border-[var(--lab-border-strong)] bg-[var(--lab-surface)] shadow-2xl',
          modalSizeClass[size],
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="lab-modal__header flex items-start justify-between gap-4 border-b border-[var(--lab-border)] px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--lab-fg)]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[var(--lab-fg-soft)]">{description}</p> : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="lab-modal__close inline-flex size-9 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-fg-soft)] transition hover:bg-[var(--lab-surface-hover)] hover:text-[var(--lab-fg)]"
              aria-label="Fechar modal"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="lab-modal__body max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>

        {actions ? <div className="lab-modal__footer border-t border-[var(--lab-border)] px-6 py-5">{actions}</div> : null}
      </div>
    </div>
  )
}

function resolveLead(icon: LabEmptyStateProps['icon']) {
  if (!icon) {
    return null
  }

  if (isValidElement(icon)) {
    return icon
  }

  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon)) {
    return createElement(icon as LucideIcon, { className: 'size-5' })
  }

  return icon
}
