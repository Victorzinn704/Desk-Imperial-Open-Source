import { Bell, CalendarRange } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import { CheckboxField } from '@/components/shared/checkbox-field'
import { SelectField } from '@/components/shared/select-field'
import { Button } from '@/components/shared/button'
import { type DashboardSectionId } from '@/components/dashboard/dashboard-navigation'
import { type WorkspacePreferences, periodOptions } from '@/components/dashboard/settings/constants'
import { SettingsInfoCard } from '@/components/dashboard/settings/components/settings-info-card'

type PreferencesTabProps = Readonly<{
  preferences: WorkspacePreferences
  onNavigateSection: (sectionId: DashboardSectionId) => void
  onPreferencesChange: Dispatch<SetStateAction<WorkspacePreferences>>
}>

export function PreferencesTab({ preferences, onNavigateSection, onPreferencesChange }: PreferencesTabProps) {
  return (
    <section className="space-y-6">
      <article className="rounded-3xl border border-white/[0.06] bg-white/5 p-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(37,99,235,0.18)] bg-[rgba(37,99,235,0.08)] text-[var(--accent)]">
              <Bell className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Preferências do workspace</p>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Leitura visual e rotina da operação</h2>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-[var(--text-soft)]">
            Essas preferências organizam o ambiente neste dispositivo sem interferir no núcleo crítico do sistema.
          </p>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <article className="rounded-[26px] border border-white/10 bg-white/5 p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Painéis com prioridade</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">O que fica mais visível na leitura executiva</h3>

          <div className="mt-6 space-y-4">
            {(
              [
                { key: 'revenue', label: 'Receita e financeiro' },
                { key: 'operations', label: 'Operação comercial' },
                { key: 'map', label: 'Mapa e território' },
                { key: 'team', label: 'Equipe e produtividade' },
              ] as const
            ).map(({ key, label }) => (
              <CheckboxField
                checked={preferences.executiveModules[key]}
                description="Ajuste local salvo neste dispositivo para destacar o que mais importa na leitura do dashboard."
                key={key}
                label={label}
                onChange={(event) =>
                  onPreferencesChange((current) => ({
                    ...current,
                    executiveModules: {
                      ...current.executiveModules,
                      [key]: event.currentTarget.checked,
                    },
                  }))
                }
              />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SelectField
              label="Período padrão"
              options={periodOptions}
              value={preferences.defaultPeriod}
              onChange={(event) =>
                onPreferencesChange((current) => ({
                  ...current,
                  defaultPeriod: event.target.value,
                }))
              }
            />
            <p className="text-xs text-[var(--text-soft)]">Define o intervalo usado por padrão em gráficos e controles.</p>
          </div>
        </article>

        <article className="rounded-[26px] border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-[var(--accent)]">
              <CalendarRange className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Agenda operacional</p>
              <h3 className="text-2xl font-semibold text-[var(--text-primary)]">Atalhos da rotina comercial</h3>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <SettingsInfoCard
              hint="A agenda comercial agora fica acessível como módulo dedicado do workspace."
              label="Calendário"
              value="Disponível"
            />
            <SettingsInfoCard
              hint="Essas preferências são locais e podem evoluir depois para persistência por conta."
              label="Persistência"
              value="Neste dispositivo"
              caption="Explore futuras integrações para sincronizar com outros dispositivos."
            />
          </div>

          <div className="mt-6">
            <Button type="button" variant="secondary" onClick={() => onNavigateSection('calendario')}>
              <CalendarRange className="size-4" />
              Abrir calendário
            </Button>
          </div>
        </article>
      </div>
    </section>
  )
}
