import { type Dispatch, type SetStateAction } from 'react'
import { CalendarRange } from 'lucide-react'
import type { DashboardSectionId } from '@/components/dashboard/dashboard-navigation'
import { CheckboxField } from '@/components/shared/checkbox-field'
import { SelectField } from '@/components/shared/select-field'
import { Button } from '@/components/shared/button'
import { periodOptions, type WorkspacePreferences } from '@/components/dashboard/settings/constants'
import { SettingsInfoCard } from '@/components/dashboard/settings/components/settings-info-card'

type PreferencesTabProps = Readonly<{
  preferences: WorkspacePreferences
  onNavigateSection: (sectionId: DashboardSectionId) => void
  onPreferencesChange: Dispatch<SetStateAction<WorkspacePreferences>>
}>

export function PreferencesTab({ preferences, onNavigateSection, onPreferencesChange }: PreferencesTabProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <article className="p-6 md:p-8 xl:border-r xl:border-[var(--border)]">
          <div className="border-b border-[var(--border)] pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Prioridade visual
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              Ajustes locais de leitura para destacar o que mais importa no desktop deste dispositivo.
            </p>
          </div>
          <div className="mt-6 grid gap-3">
            {(
              [
                { key: 'revenue', label: 'Receita e financeiro' },
                { key: 'operations', label: 'Operação comercial' },
                { key: 'map', label: 'Calendário comercial' },
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

        <article className="border-t border-[var(--border)] p-6 md:p-8 xl:border-t-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Atalhos operacionais
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
            Superfícies ligadas à rotina comercial e persistência local destas preferências.
          </p>
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
    </section>
  )
}
