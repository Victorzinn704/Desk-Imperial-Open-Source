import type { Context } from 'grammy'

export type SupportedCommand =
  | 'start'
  | 'ajuda'
  | 'menu'
  | 'status'
  | 'portal'
  | 'vendas'
  | 'caixa'
  | 'relatorio'
  | 'equipe'
  | 'alertas'
  | 'desvincular'

export type TelegramCommandName = SupportedCommand | 'cancelar' | 'fechamento'
export type TelegramCommandHandler = (ctx: Context) => Promise<void>
export type TelegramCommandHandlers = Partial<Record<TelegramCommandName, TelegramCommandHandler>>
