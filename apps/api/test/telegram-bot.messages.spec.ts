import {
  buildTelegramAlertasMessage,
  buildTelegramVendasMessage,
} from '../src/modules/notifications/telegram-bot.messages'

describe('telegram bot message templates', () => {
  it('formata alertas como central operacional legível', () => {
    const message = buildTelegramAlertasMessage(['TELEGRAM', 'EMAIL'])

    expect(message).toContain('🔔 Central de alertas')
    expect(message).toContain('<b>Canais prontos para disparo</b>')
    expect(message).toContain('✅ Telegram')
    expect(message).toContain('✅ E-mail')
    expect(message).toContain('Pagamento aprovado')
    expect(message).toContain('Pagamento recusado')
  })

  it('escapa dados dinamicos antes de enviar HTML ao Telegram', () => {
    const message = buildTelegramVendasMessage({
      currency: 'BRL',
      summary: {
        kpis: {
          faturamentoAberto: 20,
          openComandasCount: 1,
          projecaoTotal: 120,
          receitaRealizada: 100,
        },
        topProducts: [{ nome: '<script>alert(1)</script>' }],
      },
    })

    expect(message).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(message).not.toContain('<script>')
  })
})
