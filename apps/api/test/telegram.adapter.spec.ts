import { ServiceUnavailableException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { TelegramAdapter } from '../src/modules/notifications/infra/telegram/telegram.adapter'

function createConfig(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } satisfies Pick<ConfigService, 'get'>
}

describe('TelegramAdapter', () => {
  it('marca erro de bloqueio por codigo 403 ou descricao conhecida', () => {
    const adapter = new TelegramAdapter(
      createConfig({
        TELEGRAM_BOT_TOKEN: 'token',
      }) as unknown as ConfigService,
    )

    expect(adapter.isBlockedByUserError({ error_code: 403 })).toBe(true)
    expect(adapter.isBlockedByUserError({ description: 'Forbidden: bot was blocked by the user' })).toBe(true)
    expect(adapter.isBlockedByUserError({ message: 'BOT WAS BLOCKED BY THE USER' })).toBe(true)
    expect(adapter.isBlockedByUserError({ error_code: 500, description: 'other' })).toBe(false)
    expect(adapter.isBlockedByUserError(null)).toBe(false)
  })

  it('gera deeplink com o username normalizado do bot', () => {
    const adapter = new TelegramAdapter(
      createConfig({
        TELEGRAM_BOT_TOKEN: 'token',
        TELEGRAM_BOT_USERNAME: '@Desk_Imperial_bot',
      }) as unknown as ConfigService,
    )

    expect(adapter.buildDeeplink('abc')).toBe('https://t.me/Desk_Imperial_bot?start=abc')
  })

  it('falha ao gerar deeplink sem username configurado', () => {
    const adapter = new TelegramAdapter(createConfig({ TELEGRAM_BOT_TOKEN: 'token' }) as unknown as ConfigService)

    expect(() => adapter.buildDeeplink('abc')).toThrow(ServiceUnavailableException)
  })

  it('gera url publica do portal a partir de APP_URL', () => {
    const adapter = new TelegramAdapter(
      createConfig({
        TELEGRAM_BOT_TOKEN: 'token',
        APP_URL: 'https://app.deskimperial.online/',
      }) as unknown as ConfigService,
    )

    expect(adapter.buildPortalUrl('/app/owner?section=settings')).toBe(
      'https://app.deskimperial.online/app/owner?section=settings',
    )
  })

  it('gera url da imagem pública da marca para onboarding do bot', () => {
    const adapter = new TelegramAdapter(
      createConfig({
        TELEGRAM_BOT_TOKEN: 'token',
        APP_URL: 'https://app.deskimperial.online/',
      }) as unknown as ConfigService,
    )

    expect(adapter.buildBrandPhotoUrl()).toBe('https://app.deskimperial.online/icons/icon-512.png')
  })
})
