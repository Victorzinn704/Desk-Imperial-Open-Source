import { PeriodClassifierService } from '../src/common/services/period-classifier.service'

describe('PeriodClassifierService', () => {
  const classifier = new PeriodClassifierService()

  it('classifica dia de semana a tarde como normal', () => {
    const result = classifier.classify('2026-03-30T14:00:00-03:00')

    expect(result.type).toBe('normal')
    expect(result.isPeak).toBe(false)
  })

  it('classifica sexta a noite como evento e pico', () => {
    const result = classifier.classify('2026-03-27T20:00:00-03:00')

    expect(result.type).toBe('evento')
    expect(result.isPeak).toBe(true)
  })

  it('classifica sabado antes de 16h como normal e depois como evento', () => {
    expect(classifier.classify('2026-03-28T14:00:00-03:00').type).toBe('normal')
    expect(classifier.classify('2026-03-28T17:00:00-03:00').type).toBe('evento')
  })

  it('classifica domingo a noite como evento e pico', () => {
    const result = classifier.classify('2026-03-29T19:00:00-03:00')

    expect(result.type).toBe('evento')
    expect(result.isPeak).toBe(true)
  })

  it('trata janelas que terminam em meia-noite como ativas ate o fechamento do dia', () => {
    expect(classifier.isEventHour('2026-04-03T23:15:00-03:00')).toBe(true)
  })

  it('prioriza eventos especiais configurados sobre horarios de evento padrao', () => {
    const settings = PeriodClassifierService.createEstablishmentSettings({
      specialEvents: [
        {
          date: '2026-04-05',
          name: 'Domingueira especial',
          type: 'show',
          startHour: 18,
          endHour: 0,
        },
      ],
    })

    const result = classifier.classify('2026-04-05T22:30:00-03:00', settings)

    expect(result).toEqual(
      expect.objectContaining({
        type: 'evento_especial',
        eventName: 'Domingueira especial',
        eventType: 'show',
        isPeak: true,
      }),
    )
  })

  it('nao aplica evento especial fora da janela configurada', () => {
    const settings = PeriodClassifierService.createEstablishmentSettings({
      specialEvents: [
        {
          date: '2026-03-28',
          name: 'Forro do Pedra',
          type: 'forro',
          startHour: 20,
          endHour: 23,
        },
      ],
    })

    const result = classifier.classify('2026-03-28T19:00:00-03:00', settings)

    expect(result.type).not.toBe('evento_especial')
  })

  it('nao aplica evento especial em outro dia', () => {
    const settings = PeriodClassifierService.createEstablishmentSettings({
      specialEvents: [
        {
          date: '2026-03-28',
          name: 'Forro do Pedra',
          type: 'forro',
          startHour: 20,
          endHour: 23,
        },
      ],
    })

    const result = classifier.classify('2026-03-27T20:00:00-03:00', settings)

    expect(result.type).not.toBe('evento_especial')
  })

  it('aplica overrides mantendo defaults essenciais', () => {
    const settings = PeriodClassifierService.createEstablishmentSettings({
      peakHourStart: 18,
      peakHourEnd: 22,
    })

    expect(settings.businessHours).toHaveLength(7)
    expect(settings.peakHourStart).toBe(18)
    expect(settings.peakHourEnd).toBe(22)
    expect(settings.specialEvents).toEqual([])
  })

  it('respeita limites exclusivos de horario de pico', () => {
    expect(classifier.isPeakHour('2026-03-30T20:00:00-03:00')).toBe(true)
    expect(classifier.isPeakHour('2026-03-30T18:00:00-03:00')).toBe(false)
    expect(classifier.isPeakHour('2026-03-30T23:00:00-03:00')).toBe(false)
  })

  it('aceita timestamps numericos', () => {
    const date = new Date('2026-03-30T14:00:00-03:00')

    expect(classifier.classify(date.getTime()).type).toBe('normal')
  })
})
