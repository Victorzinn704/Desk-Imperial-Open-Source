import { cn } from '@/lib/utils'
import { useDeferredRender, useLowPerformanceMode } from '@/hooks/use-performance'

const FOOTBALL_WIDGET_SANDBOX =
  'allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation allow-popups-to-escape-sandbox'

type FootballWidgetFrameProps = Readonly<{
  src: string
  title: string
  heightClassName: string
  className?: string
  iframeClassName?: string
  compact?: boolean
}>

function FootballWidgetPlaceholder({
  className,
  compact,
  heightClassName,
}: Pick<FootballWidgetFrameProps, 'className' | 'compact' | 'heightClassName'>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]',
        compact ? 'h-[210px]' : heightClassName,
        className,
      )}
    >
      <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-[var(--text-soft,#7a8896)]">
        Carregando agenda esportiva...
      </div>
    </div>
  )
}

function CompactFootballFrame({
  src,
  title,
  iframeClassName,
}: Pick<FootballWidgetFrameProps, 'src' | 'title' | 'iframeClassName'>) {
  return (
    <div className="relative h-[210px] overflow-hidden">
      <iframe
        className={cn(
          'absolute left-0 top-0 block h-[270px] w-[128.25%] origin-top-left scale-[0.78] border-0 bg-transparent',
          iframeClassName,
        )}
        loading="lazy"
        referrerPolicy="unsafe-url"
        sandbox={FOOTBALL_WIDGET_SANDBOX}
        src={src}
        style={{ transformOrigin: 'top left' }}
        title={title}
      />
    </div>
  )
}

function FullFootballFrame({
  src,
  title,
  heightClassName,
  iframeClassName,
}: Pick<FootballWidgetFrameProps, 'src' | 'title' | 'heightClassName' | 'iframeClassName'>) {
  return (
    <iframe
      className={cn('block w-full border-0 bg-transparent', heightClassName, iframeClassName)}
      loading="lazy"
      referrerPolicy="unsafe-url"
      sandbox={FOOTBALL_WIDGET_SANDBOX}
      src={src}
      title={title}
    />
  )
}

export function FootballWidgetFrame({
  src,
  title,
  heightClassName,
  className,
  iframeClassName,
  compact = false,
}: FootballWidgetFrameProps) {
  const isLowPerformance = useLowPerformanceMode()
  const shouldRenderIframe = useDeferredRender({
    delayMs: compact || isLowPerformance ? 900 : 260,
  })

  if (!shouldRenderIframe) {
    return <FootballWidgetPlaceholder className={className} compact={compact} heightClassName={heightClassName} />
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]', className)}>
      {compact ? (
        <CompactFootballFrame iframeClassName={iframeClassName} src={src} title={title} />
      ) : (
        <FullFootballFrame
          heightClassName={heightClassName}
          iframeClassName={iframeClassName}
          src={src}
          title={title}
        />
      )}
    </div>
  )
}

export function VascoNextMatchWidget({
  className,
  iframeClassName,
  compact = false,
}: Readonly<{ className?: string; iframeClassName?: string; compact?: boolean }>) {
  return (
    <FootballWidgetFrame
      className={className}
      compact={compact}
      heightClassName="h-[270px]"
      iframeClassName={iframeClassName}
      src="https://widget.api-futebol.com.br/render/widget_66d7c35654194dd2"
      title="Próximo jogo do Vasco"
    />
  )
}

export function VascoCalendarWidget({
  className,
  iframeClassName,
}: Readonly<{ className?: string; iframeClassName?: string }>) {
  return (
    <FootballWidgetFrame
      className={className}
      heightClassName="h-[700px] min-h-[700px]"
      iframeClassName={iframeClassName}
      src="https://widget.api-futebol.com.br/render/widget_2d9b880d73452c7e"
      title="Calendário de jogos do Vasco"
    />
  )
}
