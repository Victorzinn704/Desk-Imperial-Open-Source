import { Injectable } from '@nestjs/common'

export interface PeriodClassificationResult {
  type: 'normal' | 'evento' | 'evento_especial'
  eventName?: string
  eventType?: string
  isPeak: boolean
  description: string
}

interface BusinessHours {
  dayOfWeek: number // 0-6 (domingo-sábado)
  normalStart: number // hora (0-23)
  normalEnd: number // hora (0-23)
  eventStart?: number // hora quando eventos começam (ex: 16 para 16h)
  eventEnd?: number
}

interface EstablishmentSettings {
  // Horários padrão por dia da semana
  businessHours: BusinessHours[]
  // Horários de pico (para bonus analytics)
  peakHourStart?: number // ex: 19
  peakHourEnd?: number // ex: 23
  // Eventos especiais marcados manualmente
  specialEvents: Array<{
    date: string // YYYY-MM-DD
    name: string
    type: string // 'jogo', 'forró', 'pagode', etc
    startHour: number
    endHour: number
  }>
}

/**
 * PeriodClassifier: Classifica vendas por contexto temporal
 *
 * Funciona para qualquer tipo de comercio (bar, restaurante, loja, etc)
 * Os horários são configuráveis por estabelecimento
 *
 * Exemplo para Bar do Pedrão:
 * - Segunda a quinta: vendas normais em qualquer horário (09h-00h)
 * - Sexta, sábado, domingo: vendas normais até 16h, vendas em evento a partir das 16h
 * - Horários de pico: 19h-23h em dias de evento
 * - Eventos especiais: Forró, Pagode, Jogo (marcação manual)
 */
@Injectable()
export class PeriodClassifierService {
  private static readonly DEFAULT_TIME_ZONE = 'America/Sao_Paulo'

  private defaultSettings: EstablishmentSettings = {
    businessHours: [
      // Domingo
      { dayOfWeek: 0, normalStart: 9, normalEnd: 16, eventStart: 16, eventEnd: 0 },
      // Segunda
      { dayOfWeek: 1, normalStart: 9, normalEnd: 0 },
      // Terça
      { dayOfWeek: 2, normalStart: 9, normalEnd: 0 },
      // Quarta
      { dayOfWeek: 3, normalStart: 9, normalEnd: 0 },
      // Quinta
      { dayOfWeek: 4, normalStart: 9, normalEnd: 0 },
      // Sexta
      { dayOfWeek: 5, normalStart: 9, normalEnd: 16, eventStart: 16, eventEnd: 0 },
      // Sábado
      { dayOfWeek: 6, normalStart: 9, normalEnd: 16, eventStart: 16, eventEnd: 0 },
    ],
    peakHourStart: 19,
    peakHourEnd: 23,
    specialEvents: [],
  }

  /**
   * Classifica uma timestamp de venda
   * @param timestamp Data/hora da venda
   * @param settings Configurações do estabelecimento (usa default se não fornecido)
   * @returns Resultado da classificação
   */
  classify(timestamp: Date | string | number, settings?: EstablishmentSettings): PeriodClassificationResult {
    const date = new Date(timestamp)
    const businessSettings = settings || this.defaultSettings

    // 1. Verificar se é evento especial
    const specialEvent = this.checkSpecialEvent(date, businessSettings.specialEvents)
    if (specialEvent) {
      return {
        type: 'evento_especial',
        eventName: specialEvent.name,
        eventType: specialEvent.type,
        isPeak: this.isPeakHour(date, businessSettings),
        description: `Evento especial: ${specialEvent.name}`,
      }
    }

    // 2. Verificar se é horário de evento (normal)
    if (this.isEventHour(date, businessSettings)) {
      return {
        type: 'evento',
        isPeak: this.isPeakHour(date, businessSettings),
        description: 'Venda em horário de evento',
      }
    }

    // 3. É venda normal
    return {
      type: 'normal',
      isPeak: this.isPeakHour(date, businessSettings),
      description: 'Venda em horário normal',
    }
  }

  /**
   * Verifica se a hora é de evento (ex: sexta/sábado/domingo a partir das 16h)
   */
  isEventHour(timestamp: Date | string | number, settings?: EstablishmentSettings): boolean {
    const date = new Date(timestamp)
    const businessSettings = settings || this.defaultSettings
    const { dayOfWeek, hour } = this.getLocalDateParts(date)

    const daySettings = businessSettings.businessHours.find((bh) => bh.dayOfWeek === dayOfWeek)

    if (daySettings?.eventStart === undefined || daySettings?.eventEnd === undefined) {
      return false
    }

    // Comparação: eventStart é a hora inicial dos eventos
    if (daySettings.eventEnd === 0) {
      // Event vai até meia-noite
      return hour >= daySettings.eventStart
    }

    return hour >= daySettings.eventStart && hour < daySettings.eventEnd
  }

  /**
   * Verifica se a hora está em horário de pico (normalmente 19h-23h)
   */
  isPeakHour(timestamp: Date | string | number, settings?: EstablishmentSettings): boolean {
    const date = new Date(timestamp)
    const businessSettings = settings || this.defaultSettings
    const { hour } = this.getLocalDateParts(date)

    if (!businessSettings.peakHourStart || !businessSettings.peakHourEnd) {
      return false
    }

    return hour >= businessSettings.peakHourStart && hour < businessSettings.peakHourEnd
  }

  /**
   * Retorna contexto completo da venda
   */
  getContext(timestamp: Date | string | number, settings?: EstablishmentSettings): PeriodClassificationResult {
    return this.classify(timestamp, settings)
  }

  /**
   * Verifica se a data/hora corresponde a um evento especial marcado
   */
  private checkSpecialEvent(
    timestamp: Date,
    specialEvents: Array<{ date: string; name: string; type: string; startHour: number; endHour: number }>,
  ) {
    const { dateStr, hour } = this.getLocalDateParts(timestamp)

    return specialEvents.find((event) => {
      const isSameDay = event.date === dateStr
      const isInTimeRange = hour >= event.startHour && (event.endHour === 0 || hour < event.endHour)
      return isSameDay && isInTimeRange
    })
  }

  /**
   * Cria settings customizados para um estabelecimento
   * Útil para criar presets ou permitir que usuários customizem
   */
  static createEstablishmentSettings(overrides?: Partial<EstablishmentSettings>): EstablishmentSettings {
    const defaults = {
      businessHours: [
        { dayOfWeek: 0, normalStart: 9, normalEnd: 16, eventStart: 16, eventEnd: 0 },
        { dayOfWeek: 1, normalStart: 9, normalEnd: 0 },
        { dayOfWeek: 2, normalStart: 9, normalEnd: 0 },
        { dayOfWeek: 3, normalStart: 9, normalEnd: 0 },
        { dayOfWeek: 4, normalStart: 9, normalEnd: 0 },
        { dayOfWeek: 5, normalStart: 9, normalEnd: 16, eventStart: 16, eventEnd: 0 },
        { dayOfWeek: 6, normalStart: 9, normalEnd: 16, eventStart: 16, eventEnd: 0 },
      ],
      peakHourStart: 19,
      peakHourEnd: 23,
      specialEvents: [],
    }

    return { ...defaults, ...overrides }
  }

  private getLocalDateParts(timestamp: Date) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: PeriodClassifierService.DEFAULT_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(timestamp)
    const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value
    const year = getPart('year')
    const month = getPart('month')
    const day = getPart('day')
    const hour = Number(getPart('hour') ?? '0')
    const weekday = getPart('weekday')
    const dayOfWeek = this.mapWeekdayToIndex(weekday)

    return {
      dateStr: `${year}-${month}-${day}`,
      dayOfWeek,
      hour,
    }
  }

  private mapWeekdayToIndex(weekday?: string) {
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
}
