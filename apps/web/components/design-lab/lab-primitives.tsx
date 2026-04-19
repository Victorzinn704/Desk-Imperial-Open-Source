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
  actions?: ReactNode
  tabs?: ReactNode
  children?: ReactNode
  className?: string
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
  actions,
  tabs,
  children,
  className,
}: LabPageHeaderProps) {
  return (
    <header
      className={cn(
        'space-y-5 border-b border-[var(--lab-border)] pb-5',
        className,
      )}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase text-[var(--lab-fg-muted)]">{eyebrow}</p>
          ) : null}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-[var(--lab-fg)] sm:text-4xl">{title}</h1>
            {description ? (
              <p className="max-w-4xl text-sm leading-6 text-[var(--lab-fg-soft)] sm:text-[15px]">{description}</p>
            ) : null}
          </div>
          {children ? <div className="pt-1">{children}</div> : null}
        </div>

        {(meta || actions) && (
          <div className="flex w-full flex-col gap-3 xl:max-w-md xl:items-end">
            {meta ? (
              <div className="w-full rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)] p-4 xl:max-w-sm">
                {meta}
              </div>
            ) : null}
            {actions ? <div className="flex flex-wrap items-center gap-2 xl:justify-end">{actions}</div> : null}
          </div>
        )}
      </div>

      {tabs ? <div className="flex flex-wrap items-center gap-2">{tabs}</div> : null}
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
        'overflow-hidden rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)]',
        elevated && 'bg-[var(--lab-surface-raised)]',
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <div
          className={cn(
            'flex items-start justify-between gap-4 border-b border-[var(--lab-border)] px-5 py-4',
            headerClassName,
          )}
        >
          <div className="min-w-0 flex-1">
            {title ? <h2 className="text-base font-semibold text-[var(--lab-fg)]">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-[var(--lab-fg-soft)]">{subtitle}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      ) : null}

      <div className={cn(panelPaddingClass[padding], contentClassName)}>{children}</div>

      {footer ? <div className="border-t border-[var(--lab-border)] px-5 py-4">{footer}</div> : null}
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
    <LabPanel className={className} padding="md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {Icon ? (
              <span className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-blue)]">
                <Icon className="size-5" />
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-[var(--lab-fg-muted)]">{label}</p>
              <p className="mt-2 truncate text-3xl font-semibold text-[var(--lab-fg)] sm:text-[32px]">{value}</p>
            </div>
          </div>
        </div>
        {delta ? (
          <LabStatusPill tone={deltaTone} size="md">
            {delta}
          </LabStatusPill>
        ) : null}
      </div>

      {hint ? <p className="mt-4 text-sm leading-6 text-[var(--lab-fg-soft)]">{hint}</p> : null}

      {progressWidth ? (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
            <div className="h-full rounded-full bg-[var(--lab-blue)]" style={{ width: progressWidth }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--lab-fg-muted)]">
            <span>{progressWidth} concluído</span>
            <span>ritmo operacional</span>
          </div>
        </div>
      ) : null}

      {footer ? <div className="mt-4">{footer}</div> : null}
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
  emptyDescription = 'Quando houver dados reais aqui, a leitura aparece neste painel.',
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
    <div className={cn('overflow-x-auto rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)]', className)}>
      <table className={cn('min-w-full text-sm', tableClassName)}>
        <thead className="border-b border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-xs uppercase text-[var(--lab-fg-muted)]">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  'px-4 font-medium',
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
        <tbody className="divide-y divide-[var(--lab-border)]">
          {rows.map((row, index) => {
            const resolvedKey =
              typeof rowKey === 'function'
                ? rowKey(row, index)
                : String((row as Record<string, unknown>)[rowKey as string] ?? index)

            return (
              <tr
                key={resolvedKey}
                className={cn(
                  'text-[var(--lab-fg-soft)] transition hover:bg-[var(--lab-surface-hover)]',
                  rowClassName?.(row, index),
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      'px-4 align-middle',
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
        'rounded-2xl border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface)]',
        compact ? 'px-5 py-8' : 'px-6 py-12',
        className,
      )}
    >
      <div className={cn('mx-auto flex max-w-xl flex-col items-center text-center', compact ? 'gap-3' : 'gap-4')}>
        {lead ? (
          <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-blue)]">
            {lead}
          </span>
        ) : null}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[var(--lab-fg)]">{title}</h3>
          {description ? <p className="text-sm leading-6 text-[var(--lab-fg-soft)]">{description}</p> : null}
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
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
        'inline-flex items-center rounded-full border font-medium',
        pillToneClass[tone],
        pillSizeClass[size],
        className,
      )}
      {...props}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </span>
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
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6" role="presentation">
      {onClose ? (
        <button
          aria-label={closeLabel}
          className="absolute inset-0 border-0 p-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--lab-bg) 74%, transparent)' }}
          type="button"
          onClick={onClose}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--lab-bg) 74%, transparent)' }}
        />
      )}
      <div
        className={cn(
          'relative z-[1] w-full rounded-[28px] border border-[var(--lab-border-strong)] bg-[var(--lab-surface)] shadow-2xl',
          modalSizeClass[size],
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--lab-border)] px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--lab-fg)]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[var(--lab-fg-soft)]">{description}</p> : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-fg-soft)] transition hover:bg-[var(--lab-surface-hover)] hover:text-[var(--lab-fg)]"
              aria-label="Fechar modal"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>

        {actions ? <div className="border-t border-[var(--lab-border)] px-6 py-5">{actions}</div> : null}
      </div>
    </div>
  )
}

function resolveLead(icon: LabEmptyStateProps['icon']) {
  if (!icon) return null

  if (isValidElement(icon)) {
    return icon
  }

  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon)) {
    return createElement(icon as LucideIcon, { className: 'size-5' })
  }

  return icon
}
