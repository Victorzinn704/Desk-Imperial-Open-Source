import { Injectable } from '@nestjs/common'

export type PeriodType = 'normal' | 'evento' | 'evento_especial'

export interface PeriodClassificationResult {
  type: PeriodType
  eventName?: string
  eventType?: string
  isPeak: boolean
  description: string
}

export interface BusinessHours {
  dayOfWeek: number
  normalStart: number
  normalEnd: number
  eventStart?: number
  eventEnd?: number
}

export interface SpecialEvent {
  date: string
  name: string
  type: string
  startHour: number
  endHour: number
}

export interface EstablishmentSettings {
  businessHours: BusinessHours[]
  peakHourStart?: number
  peakHourEnd?: number
  specialEvents: SpecialEvent[]
}

const DEFAULT_TIME_ZONE = 'America/Sao_Paulo'
const DEFAULT_BUSINESS_HOURS: BusinessHours[] = [
  { dayOfWeek: 0, normalStart: 9, normalEnd: 16, eventStart: 16, eventEnd: 0 },
  { dayOfWeek: 1, normalStart: 9, normalEnd: 0 },
  { dayOfWeek: 2, normalStart: 9, normalEnd: 0 },
  { dayOfWeek: 3, normalStart: 9, normalEnd: 0 },
  { dayOfWeek: 4, normalStart: 9, normalEnd: 0 },
  { dayOfWeek: 5, normalStart: 9, normalEnd: 16, eventStart: 16, eventEnd: 0 },
  { dayOfWeek: 6, normalStart: 9, normalEnd: 16, eventStart: 16, eventEnd: 0 },
]

const DEFAULT_SETTINGS: EstablishmentSettings = {
  businessHours: DEFAULT_BUSINESS_HOURS,
  peakHourStart: 19,
  peakHourEnd: 23,
  specialEvents: [],
}

@Injectable()
export class PeriodClassifierService {
  classify(timestamp: Date | string | number, settings = DEFAULT_SETTINGS): PeriodClassificationResult {
    const date = new Date(timestamp)
    const specialEvent = this.findSpecialEvent(date, settings.specialEvents)

    if (specialEvent) {
      return {
        type: 'evento_especial',
        eventName: specialEvent.name,
        eventType: specialEvent.type,
        isPeak: this.isPeakHour(date, settings),
        description: `Evento especial: ${specialEvent.name}`,
      }
    }

    if (this.isEventHour(date, settings)) {
      return {
        type: 'evento',
        isPeak: this.isPeakHour(date, settings),
        description: 'Venda em horario de evento',
      }
    }

    return {
      type: 'normal',
      isPeak: this.isPeakHour(date, settings),
      description: 'Venda em horario normal',
    }
  }

  isEventHour(timestamp: Date | string | number, settings = DEFAULT_SETTINGS) {
    const { dayOfWeek, hour } = getLocalDateParts(new Date(timestamp))
    const daySettings = settings.businessHours.find((entry) => entry.dayOfWeek === dayOfWeek)

    if (daySettings?.eventStart === undefined || daySettings.eventEnd === undefined) {
      return false
    }

    if (daySettings.eventEnd === 0) {
      return hour >= daySettings.eventStart
    }

    return hour >= daySettings.eventStart && hour < daySettings.eventEnd
  }

  isPeakHour(timestamp: Date | string | number, settings = DEFAULT_SETTINGS) {
    if (settings.peakHourStart === undefined || settings.peakHourEnd === undefined) {
      return false
    }

    const { hour } = getLocalDateParts(new Date(timestamp))
    return hour >= settings.peakHourStart && hour < settings.peakHourEnd
  }

  getContext(timestamp: Date | string | number, settings = DEFAULT_SETTINGS) {
    return this.classify(timestamp, settings)
  }

  static createEstablishmentSettings(overrides: Partial<EstablishmentSettings> = {}): EstablishmentSettings {
    return {
      ...DEFAULT_SETTINGS,
      ...overrides,
      businessHours: overrides.businessHours ?? [...DEFAULT_BUSINESS_HOURS],
      specialEvents: overrides.specialEvents ?? [],
    }
  }

  private findSpecialEvent(timestamp: Date, specialEvents: ReadonlyArray<SpecialEvent>) {
    const { date, hour } = getLocalDateParts(timestamp)

    return specialEvents.find((event) => {
      const matchesDate = event.date === date
      const matchesHour = hour >= event.startHour && (event.endHour === 0 || hour < event.endHour)
      return matchesDate && matchesHour
    })
  }
}

function getLocalDateParts(timestamp: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(timestamp)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value

  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    dayOfWeek: mapWeekdayToIndex(part('weekday')),
    hour: Number(part('hour') ?? '0'),
  }
}

function mapWeekdayToIndex(weekday?: string) {
  switch (weekday) {
    case 'Sun':
      return 0
    case 'Mon':
      return 1
    case 'Tue':
      return 2
    case 'Wed':
      return 3
    case 'Thu':
      return 4
    case 'Fri':
      return 5
    case 'Sat':
      return 6
    default:
      return 0
  }
}
