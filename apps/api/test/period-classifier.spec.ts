import { PeriodClassifierService } from '../src/common/services/period-classifier.service'

describe('PeriodClassifierService', () => {
  let classifier: PeriodClassifierService

  beforeEach(() => {
    classifier = new PeriodClassifierService()
  })

  describe('classify', () => {
    it('classifies weekday afternoon as normal', () => {
      // Monday 14:00
      const result = classifier.classify(new Date('2026-03-30T14:00:00'))
      expect(result.type).toBe('normal')
      expect(result.isPeak).toBe(false)
    })

    it('classifies Friday evening as evento', () => {
      // Friday 20:00
      const result = classifier.classify(new Date('2026-03-27T20:00:00'))
      expect(result.type).toBe('evento')
      expect(result.isPeak).toBe(true)
    })

    it('classifies Saturday afternoon (before 16h) as normal', () => {
      // Saturday 14:00
      const result = classifier.classify(new Date('2026-03-28T14:00:00'))
      expect(result.type).toBe('normal')
    })

    it('classifies Saturday evening (after 16h) as evento', () => {
      // Saturday 17:00
      const result = classifier.classify(new Date('2026-03-28T17:00:00'))
      expect(result.type).toBe('evento')
    })

    it('classifies Sunday evening as evento', () => {
      // Sunday 19:00
      const result = classifier.classify(new Date('2026-03-29T19:00:00'))
      expect(result.type).toBe('evento')
      expect(result.isPeak).toBe(true)
    })

    it('classifies special events correctly', () => {
      const settings = PeriodClassifierService.createEstablishmentSettings({
        specialEvents: [{ date: '2026-03-28', name: 'Forró do Pedrão', type: 'forro', startHour: 20, endHour: 23 }],
      })

      // UTC hour 23 → local hour 20 in UTC-3 (Brasil)
      // toISOString() date = 2026-03-28 (matches event date)
      const utcDate = new Date(Date.UTC(2026, 2, 28, 23, 0, 0))
      const result = classifier.classify(utcDate, settings)
      expect(result.type).toBe('evento_especial')
      expect(result.eventName).toBe('Forró do Pedrão')
      expect(result.eventType).toBe('forro')
    })

    it('does not match special event outside time range', () => {
      const settings = PeriodClassifierService.createEstablishmentSettings({
        specialEvents: [{ date: '2026-03-28', name: 'Forró do Pedrão', type: 'forro', startHour: 20, endHour: 23 }],
      })

      // UTC hour 22 → local hour 19 in UTC-3 (before 20h start)
      const utcDate = new Date(Date.UTC(2026, 2, 28, 22, 0, 0))
      const result = classifier.classify(utcDate, settings)
      expect(result.type).not.toBe('evento_especial')
    })

    it('does not match special event on different day', () => {
      const settings = PeriodClassifierService.createEstablishmentSettings({
        specialEvents: [{ date: '2026-03-28', name: 'Forró do Pedrão', type: 'forro', startHour: 20, endHour: 23 }],
      })

      // UTC hour 3 on March 27 → local 00:00 on March 27 (wrong day)
      const utcDate = new Date(Date.UTC(2026, 2, 27, 3, 0, 0))
      const result = classifier.classify(utcDate, settings)
      expect(result.type).not.toBe('evento_especial')
    })
  })

  describe('isEventHour', () => {
    it('returns false for Monday', () => {
      expect(classifier.isEventHour(new Date('2026-03-30T20:00:00'))).toBe(false)
    })

    it('returns true for Friday 17h', () => {
      expect(classifier.isEventHour(new Date('2026-03-27T17:00:00'))).toBe(true)
    })

    it('returns false for Friday 15h', () => {
      expect(classifier.isEventHour(new Date('2026-03-27T15:00:00'))).toBe(false)
    })

    it('returns true for Saturday 23h (eventEnd=0 means until midnight)', () => {
      expect(classifier.isEventHour(new Date('2026-03-28T23:00:00'))).toBe(true)
    })
  })

  describe('isPeakHour', () => {
    it('returns true for 20h (between 19-23)', () => {
      expect(classifier.isPeakHour(new Date('2026-03-30T20:00:00'))).toBe(true)
    })

    it('returns false for 18h', () => {
      expect(classifier.isPeakHour(new Date('2026-03-30T18:00:00'))).toBe(false)
    })

    it('returns false for 23h (peakEnd is exclusive)', () => {
      expect(classifier.isPeakHour(new Date('2026-03-30T23:00:00'))).toBe(false)
    })
  })

  describe('createEstablishmentSettings', () => {
    it('returns defaults when no overrides', () => {
      const settings = PeriodClassifierService.createEstablishmentSettings()
      expect(settings.businessHours).toHaveLength(7)
      expect(settings.peakHourStart).toBe(19)
      expect(settings.peakHourEnd).toBe(23)
      expect(settings.specialEvents).toEqual([])
    })

    it('applies overrides', () => {
      const settings = PeriodClassifierService.createEstablishmentSettings({
        peakHourStart: 18,
        peakHourEnd: 22,
      })
      expect(settings.peakHourStart).toBe(18)
      expect(settings.peakHourEnd).toBe(22)
      expect(settings.businessHours).toHaveLength(7) // preserved
    })
  })

  describe('edge cases', () => {
    it('accepts string timestamps', () => {
      const result = classifier.classify('2026-03-30T14:00:00')
      expect(result.type).toBe('normal')
    })

    it('accepts numeric timestamps', () => {
      const date = new Date('2026-03-30T14:00:00')
      const result = classifier.classify(date.getTime())
      expect(result.type).toBe('normal')
    })
  })
})
