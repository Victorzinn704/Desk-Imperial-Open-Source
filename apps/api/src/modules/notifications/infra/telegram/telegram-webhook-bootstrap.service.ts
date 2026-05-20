import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { TelegramAdapter } from './telegram.adapter'

/**
 * Registra/atualiza webhook + comandos + branding ao subir a API. Idempotente:
 * se URL e secret nao mudaram, Telegram aceita o setWebhook silenciosamente.
 */
@Injectable()
export class TelegramWebhookBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramWebhookBootstrap.name)

  constructor(private readonly adapter: TelegramAdapter) {}

  async onApplicationBootstrap() {
    if (!this.adapter.isBotEnabled()) {
      this.logger.log('Telegram bot desabilitado — bootstrap pulado.')
      return
    }

    const webhookUrl = this.adapter.getWebhookUrl()
    const secret = this.adapter.getWebhookSecret()

    if (!webhookUrl) {
      this.logger.warn('TELEGRAM_WEBHOOK_URL ausente — webhook nao registrado. Defina a URL HTTPS publica em produção.')
      return
    }

    try {
      await this.adapter.setWebhook(webhookUrl, secret)
      this.logger.log(`Webhook Telegram registrado em ${webhookUrl}`)
    } catch (err) {
      this.logger.error(
        `Falha ao registrar webhook Telegram (${webhookUrl}): ${err instanceof Error ? err.message : String(err)}`,
      )
      return
    }

    try {
      await this.adapter.setMyCommands(this.adapter.buildDefaultCommands())
    } catch (err) {
      this.logger.warn(`Falha ao registrar comandos do bot: ${err instanceof Error ? err.message : 'unknown'}`)
    }

    try {
      await this.adapter.setMyDescription(this.adapter.buildBotDescription())
      await this.adapter.setMyShortDescription(this.adapter.buildBotShortDescription())
    } catch (err) {
      this.logger.warn(`Falha ao atualizar descricao do bot: ${err instanceof Error ? err.message : 'unknown'}`)
    }

    try {
      await this.adapter.setChatMenuButton()
    } catch {
      // chat menu button is best-effort
    }
  }
}
