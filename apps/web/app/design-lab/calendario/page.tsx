'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

type EventType = 'promocao' | 'evento' | 'jogo' | 'feriado' | 'reserva'

interface CalEvent {
  id: string
  title: string
  type: EventType
  day: number
  time?: string
  impact?: string
}

const EVENT_CONFIG: Record<EventType, { label: string; color: string; bg: string }> = {
  promocao: { label: 'Promoção', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  evento: { label: 'Evento', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  jogo: { label: 'Jogo', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  feriado: { label: 'Feriado', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  reserva: { label: 'Reserva', color: '#008cff', bg: 'rgba(0,140,255,0.15)' },
}

const EVENTS: CalEvent[] = [
  { id: '1', title: 'Happy Hour 50%', type: 'promocao', day: 4, time: '18:00', impact: '+35%' },
  { id: '2', title: 'Reserva — Empresa XYZ', type: 'reserva', day: 5, time: '20:30' },
  { id: '3', title: 'Flamengo x Palmeiras', type: 'jogo', day: 6, time: '16:00', impact: '+60%' },
  { id: '4', title: 'Dia dos Pais — Especial', type: 'evento', day: 7, time: 'dia todo', impact: '+45%' },
  { id: '5', title: 'Promoção Combo + Suco', type: 'promocao', day: 10, impact: '+20%' },
  { id: '6', title: 'Reserva — Aniversário', type: 'reserva', day: 11, time: '19:00' },
  { id: '7', title: 'Brasil x Argentina', type: 'jogo', day: 12, time: '21:00', impact: '+80%' },
  { id: '8', title: 'Tiradentes', type: 'feriado', day: 21, impact: '+25%' },
  { id: '9', title: 'Festival de Música', type: 'evento', day: 19, time: 'fim de semana', impact: '+40%' },
  { id: '10', title: 'Promoção Pizza 2×1', type: 'promocao', day: 25, impact: '+30%' },
  { id: '11', title: 'Reserva — Formatura', type: 'reserva', day: 26, time: '20:00' },
  { id: '12', title: 'Copa do Estado Final', type: 'jogo', day: 28, time: '15:00', impact: '+55%' },
]

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// April 2026 starts on Wednesday (day 3 index)
const MONTH_START_DOW = 3
const MONTH_DAYS = 30
const MONTH_NAME = 'Abril 2026'

export default function CalendarioPage() {
  const [selected, setSelected] = useState<number | null>(7)

  const cells: (number | null)[] = [
    ...Array(MONTH_START_DOW).fill(null),
    ...Array.from({ length: MONTH_DAYS }, (_, i) => i + 1),
  ]

  // Pad to complete last week row
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedEvents = selected ? EVENTS.filter((e) => e.day === selected) : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="lab-heading">Calendário Comercial</h1>
          <p className="lab-subheading">Eventos, promoções e impacto nas vendas</p>
        </div>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 14px',
            height: 34,
            background: 'var(--lab-blue)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus className="size-4" />
          Novo Evento
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(Object.entries(EVENT_CONFIG) as [EventType, { label: string; color: string; bg: string }][]).map(
          ([type, cfg]) => (
            <span
              key={type}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: cfg.color,
                background: cfg.bg,
                borderRadius: 20,
                padding: '3px 10px',
              }}
            >
              {cfg.label}
            </span>
          ),
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        {/* Calendar grid */}
        <div className="lab-card">
          <div className="lab-card-header">
            <button className="lab-icon-btn" type="button" style={{ border: '1px solid var(--lab-border)' }}>
              <ChevronLeft className="size-4" />
            </button>
            <h2 className="lab-card-title" style={{ margin: '0 auto' }}>
              {MONTH_NAME}
            </h2>
            <button className="lab-icon-btn" type="button" style={{ border: '1px solid var(--lab-border)' }}>
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="lab-card-p" style={{ paddingTop: 0 }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {DAYS_OF_WEEK.map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--lab-fg-muted)',
                    padding: '4px 0',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {cells.map((day, idx) => {
                const dayEvents = day ? EVENTS.filter((e) => e.day === day) : []
                const isSelected = day === selected
                const isToday = day === 7

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => day && setSelected(day)}
                    style={{
                      minHeight: 64,
                      borderRadius: 8,
                      padding: '6px',
                      border: isSelected ? '1px solid var(--lab-blue)' : '1px solid var(--lab-border)',
                      background: isSelected ? 'var(--lab-blue-soft)' : day ? 'var(--lab-surface)' : 'transparent',
                      cursor: day ? 'pointer' : 'default',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    {day && (
                      <>
                        <div
                          style={
                            {
                              fontSize: 12,
                              fontWeight: isToday ? 700 : 500,
                              color: isToday ? 'white' : 'var(--lab-fg)',
                              marginBottom: 4,
                              width: 22,
                              height: 22,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              background: isToday ? 'var(--lab-blue)' : 'transparent',
                            } as React.CSSProperties
                          }
                        >
                          {day}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {dayEvents.slice(0, 2).map((ev) => {
                            const cfg = EVENT_CONFIG[ev.type]
                            return (
                              <div
                                key={ev.id}
                                style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  color: cfg.color,
                                  background: cfg.bg,
                                  borderRadius: 3,
                                  padding: '1px 4px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {ev.title}
                              </div>
                            )
                          })}
                          {dayEvents.length > 2 && (
                            <div style={{ fontSize: 9, color: 'var(--lab-fg-muted)', paddingLeft: 2 }}>
                              +{dayEvents.length - 2}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Side panel — selected day events */}
        <div className="lab-card">
          <div className="lab-card-header">
            <div>
              <h2 className="lab-card-title">{selected ? `${selected} de Abril` : 'Selecione um dia'}</h2>
              <p className="lab-card-subtitle">
                {selected ? `${selectedEvents.length} evento${selectedEvents.length !== 1 ? 's' : ''}` : ''}
              </p>
            </div>
          </div>
          <div className="lab-card-p flex flex-col gap-3">
            {selectedEvents.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--lab-fg-muted)', textAlign: 'center', padding: '24px 0' }}>
                Nenhum evento neste dia
              </p>
            )}
            {selectedEvents.map((ev) => {
              const cfg = EVENT_CONFIG[ev.type]
              return (
                <div
                  key={ev.id}
                  style={{
                    borderRadius: 8,
                    padding: 12,
                    background: cfg.bg,
                    border: `1px solid ${cfg.color}30`,
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: cfg.color,
                        background: `${cfg.color}22`,
                        borderRadius: 4,
                        padding: '1px 6px',
                      }}
                    >
                      {cfg.label}
                    </span>
                    {ev.impact && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{ev.impact} vendas</span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--lab-fg)', margin: '4px 0 2px' }}>
                    {ev.title}
                  </p>
                  {ev.time && <p style={{ fontSize: 11, color: 'var(--lab-fg-muted)', margin: 0 }}>⏰ {ev.time}</p>}
                </div>
              )
            })}
          </div>

          {/* Upcoming events */}
          <div style={{ borderTop: '1px solid var(--lab-border)', padding: '12px 16px' }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--lab-fg-muted)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Próximos
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EVENTS.filter((e) => e.day > (selected ?? 0))
                .slice(0, 4)
                .map((ev) => {
                  const cfg = EVENT_CONFIG[ev.type]
                  return (
                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: 'var(--lab-fg)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ev.title}
                        </p>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--lab-fg-muted)', flexShrink: 0 }}>Dia {ev.day}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
