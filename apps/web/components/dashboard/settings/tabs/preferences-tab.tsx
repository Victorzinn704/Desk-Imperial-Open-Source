import { type Dispatch, type SetStateAction } from 'react'
import { Bell, CalendarRange } from 'lucide-react'
import type { DashboardSectionId } from '@/components/dashboard/dashboard-navigation'
import { CheckboxField } from '@/components/shared/checkbox-field'
import { SelectField } from '@/components/shared/select-field'
import { Button } from '@/components/shared/button'
import { type WorkspacePreferences, periodOptions } from '@/components/dashboard/settings/constants'
import { SettingsInfoCard } from '@/components/dashboard/settings/components/settings-info-card'

type PreferencesTabProps = Readonly<{
  preferences: WorkspacePreferences
  onNavigateSection: (sectionId: DashboardSectionId) => void
  onPreferencesChange: Dispatch<SetStateAction<WorkspacePreferences>>
}>

export function PreferencesTab({ preferences, onNavigateSection, onPreferencesChange }: PreferencesTabProps) {
  return (
    <>
      <article className="rounded-xl border border-white/5 bg-surface/50 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(37,99,235,0.18)] bg-[rgba(37,99,235,0.08)] text-[var(--accent)]">
            <Bell className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Preferências do workspace
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
              Leitura visual e rotina da operação
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              Essas preferências organizam o ambiente neste dispositivo sem interferir no núcleo crítico do sistema.
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <article className="rounded-xl border border-white/5 bg-surface/50 p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Painéis com prioridade
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            O que fica mais visível na leitura executiva
          </h3>

          <div className="mt-6 grid gap-3">
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

          <div className="mt-6">
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
          </div>
        </article>

        <article className="rounded-xl border border-white/5 bg-surface/50 p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Agenda operacional</p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Atalhos da rotina comercial</h3>
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
    </>
  )
}
