import { cn } from '@/lib/utils'

const FOOTBALL_WIDGET_SANDBOX =
  'allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation allow-popups-to-escape-sandbox'

type FootballWidgetFrameProps = Readonly<{
  src: string
  title: string
  heightClassName: string
  className?: string
  iframeClassName?: string
}>

export function FootballWidgetFrame({
  src,
  title,
  heightClassName,
  className,
  iframeClassName,
}: FootballWidgetFrameProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]',
        className,
      )}
    >
      <iframe
        className={cn('block w-full border-0 bg-transparent', heightClassName, iframeClassName)}
        loading="lazy"
        referrerPolicy="unsafe-url"
        sandbox={FOOTBALL_WIDGET_SANDBOX}
        src={src}
        title={title}
      />
    </div>
  )
}

export function VascoNextMatchWidget({
  className,
  iframeClassName,
}: Readonly<{ className?: string; iframeClassName?: string }>) {
  return (
    <FootballWidgetFrame
      className={className}
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
