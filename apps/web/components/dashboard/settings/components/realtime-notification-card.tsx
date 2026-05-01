'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing } from 'lucide-react'
import {
  ApiError,
  fetchUserNotificationPreferences,
  type UserNotificationPreference,
  USER_NOTIFICATION_PREFERENCES_QUERY_KEY,
  updateUserNotificationPreferences,
} from '@/lib/api'

const EVENT_GROUPS = [
  {
    eventType: 'operations.comanda.status_changed' as const,
    label: 'Mudança de status da comanda',
    description: 'Avisa quando uma mesa muda entre aberta, em preparo, pronta ou fechada.',
  },
  {
    eventType: 'operations.kitchen_item.status_changed' as const,
    label: 'Atualização de item da cozinha',
    description: 'Avisa quando um item entra na fila, vai para preparo ou fica pronto.',
  },
] as const

export function RealtimeNotificationCard() {
  const queryClient = useQueryClient()
  const preferencesQuery = useQuery({
    queryKey: [...USER_NOTIFICATION_PREFERENCES_QUERY_KEY],
    queryFn: fetchUserNotificationPreferences,
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: updateUserNotificationPreferences,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...USER_NOTIFICATION_PREFERENCES_QUERY_KEY] })
    },
  })

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : preferencesQuery.error instanceof ApiError
        ? preferencesQuery.error.message
        : null

  const preferences = preferencesQuery.data?.preferences ?? []
  const groupedPreferences = EVENT_GROUPS.map((group) => ({
    ...group,
    webPreference: preferences.find(
      (preference) =>
        preference.channel === 'WEB_TOAST' && preference.eventType === group.eventType,
    ),
    mobilePreference: preferences.find(
      (preference) =>
        preference.channel === 'MOBILE_TOAST' && preference.eventType === group.eventType,
    ),
  }))

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              borderColor: 'rgba(59, 130, 246, 0.18)',
              color: 'var(--accent, #008cff)',
            }}
          >
            <BellRing className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Alertas no aplicativo
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
              Controle o ruído do web e do mobile por usuário.
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              Estas chaves são pessoais. Cada operador decide se quer toast no desktop e no mobile para as mudanças operacionais mais ruidosas.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {groupedPreferences.map((group) => (
          <div
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"
            key={group.eventType}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{group.label}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{group.description}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <PreferenceToggle
                  disabled={mutation.isPending}
                  eventLabel={group.label}
                  label="Web"
                  preference={group.webPreference}
                  onChange={(enabled) =>
                    handleTogglePreference(
                      group.webPreference,
                      enabled,
                      preferences,
                      (nextPreferences) => mutation.mutate(nextPreferences),
                    )
                  }
                />
                <PreferenceToggle
                  disabled={mutation.isPending}
                  eventLabel={group.label}
                  label="Mobile"
                  preference={group.mobilePreference}
                  onChange={(enabled) =>
                    handleTogglePreference(
                      group.mobilePreference,
                      enabled,
                      preferences,
                      (nextPreferences) => mutation.mutate(nextPreferences),
                    )
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {errorMessage ? <p className="mt-5 text-sm text-[var(--danger)]">{errorMessage}</p> : null}
    </section>
  )
}

function PreferenceToggle({
  disabled,
  eventLabel,
  label,
  preference,
  onChange,
}: Readonly<{
  disabled: boolean
  eventLabel: string
  label: string
  preference: UserNotificationPreference | undefined
  onChange: (enabled: boolean) => void
}>) {
  const inherited = preference?.inherited ?? true
  const enabled = preference?.enabled ?? true

  return (
    <label className="flex min-w-[180px] items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
          {inherited ? 'Padrão pessoal ativo' : 'Preferência pessoal ajustada'}
        </p>
      </div>
      <input
        aria-label={`${eventLabel} · ${label}`}
        checked={enabled}
        className="mt-1 size-4 accent-[var(--accent)]"
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </label>
  )
}

function handleTogglePreference(
  target: UserNotificationPreference | undefined,
  enabled: boolean,
  preferences: UserNotificationPreference[],
  submit: (preferences: UserNotificationPreference[]) => void,
) {
  if (!target) {
    return
  }

  submit(
    preferences.map((preference) =>
      preference.channel === target.channel && preference.eventType === target.eventType
        ? { ...preference, enabled }
        : preference,
    ),
  )
}
