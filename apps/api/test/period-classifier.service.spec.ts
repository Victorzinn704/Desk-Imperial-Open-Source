import { PeriodClassifierService } from '../src/common/services/period-classifier.service'

describe('PeriodClassifierService', () => {
  const service = new PeriodClassifierService()

  it('treats event windows that end at midnight as active until the day closes', () => {
    const timestamp = new Date('2026-04-03T23:15:00-03:00')

    expect(service.isEventHour(timestamp)).toBe(true)
  })

  it('classifies configured special events before falling back to normal event hours', () => {
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

    const result = service.classify(new Date('2026-04-05T22:30:00-03:00'), settings)

    expect(result).toEqual(
      expect.objectContaining({
        type: 'evento_especial',
        eventName: 'Domingueira especial',
        eventType: 'show',
        isPeak: true,
      }),
    )
  })
})
