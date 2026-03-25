'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BadgeCheck, BadgeMinus, IdCard, ShieldUser, UserPlus, Users, type LucideIcon } from 'lucide-react'
import type { EmployeeRecord } from '@/lib/api'
import { employeeSchema, type EmployeeFormValues } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'

const emptyValues: EmployeeFormValues = {
  employeeCode: '',
  displayName: '',
  temporaryPassword: '',
}

export function EmployeeManagementCard({
  busy = false,
  employees,
  error = null,
  loading = false,
  onArchive,
  onCreate,
  onRestore,
  totals,
}: Readonly<{
  busy?: boolean
  employees: EmployeeRecord[]
  error?: string | null
  loading?: boolean
  onArchive: (employeeId: string) => void
  onCreate: (values: EmployeeFormValues) => void
  onRestore: (employeeId: string) => void
  totals?: {
    activeEmployees: number
    totalEmployees: number
  }
}>) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: emptyValues,
  })

  return (
    <article className="imperial-card p-7">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
          <ShieldUser className="size-5" />
        </span>
        <div>
          <p className="text-sm text-[var(--text-soft)]">Equipe comercial</p>
          <h2 className="text-xl font-semibold text-white">Funcionários vinculados à venda</h2>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <MiniEmployeeMetric
          icon={Users}
          label="Equipe cadastrada"
          value={String(totals?.totalEmployees ?? employees.length)}
        />
        <MiniEmployeeMetric
          icon={BadgeCheck}
          label="Ativos na operação"
          value={String(totals?.activeEmployees ?? employees.filter((employee) => employee.active).length)}
        />
      </div>

      <form
        className="mt-6 space-y-5"
        onSubmit={handleSubmit((values) => {
          onCreate(values)
          reset(emptyValues)
        })}
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <InputField
            error={errors.employeeCode?.message}
            hint="Use um código curto, como VD-001."
            label="ID do funcionário"
            placeholder="VD-001"
            {...register('employeeCode')}
          />
          <InputField
            error={errors.displayName?.message}
            label="Nome do funcionário"
            placeholder="Ana Martins"
            {...register('displayName')}
          />
          <InputField
            error={errors.temporaryPassword?.message}
            hint="Essa será a senha inicial do funcionário."
            label="Senha provisória"
            placeholder="Senha@Inicial123"
            type="password"
            {...register('temporaryPassword')}
          />
        </div>

        <p className="text-xs leading-6 text-[var(--text-soft)]">
          Login do funcionário: e-mail principal da empresa + ID do funcionário + senha provisória.
        </p>

        <Button fullWidth loading={loading} type="submit">
          <UserPlus className="size-4" />
          Cadastrar funcionário
        </Button>
      </form>

      {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="mt-6 space-y-3">
        {employees.length ? (
          employees.map((employee) => (
            <div
              className="imperial-card-soft p-4"
              key={employee.id}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
                    <IdCard className="size-4" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-medium text-white">{employee.displayName}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          employee.active
                            ? 'border border-[rgba(123,214,138,0.28)] bg-[rgba(123,214,138,0.12)] text-[var(--success)]'
                            : 'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)]'
                        }`}
                      >
                        {employee.active ? 'ativo' : 'inativo'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-soft)]">ID {employee.employeeCode}</p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                      {employee.hasLogin ? 'Acesso individual ativo' : 'Sem acesso individual'}
                    </p>
                  </div>
                </div>

                {employee.active ? (
                  <Button disabled={busy} onClick={() => onArchive(employee.id)} size="sm" variant="ghost">
                    <BadgeMinus className="size-4" />
                    Arquivar
                  </Button>
                ) : (
                  <Button disabled={busy} onClick={() => onRestore(employee.id)} size="sm" variant="secondary">
                    <BadgeCheck className="size-4" />
                    Reativar
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="imperial-card-soft border-dashed px-5 py-8 text-center">
            <p className="text-sm leading-7 text-[var(--text-soft)]">
              Cadastre IDs de funcionários para associar vendas e liberar o ranking individual no dashboard.
            </p>
          </div>
        )}
      </div>
    </article>
  )
}

function MiniEmployeeMetric({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: LucideIcon
  label: string
  value: string
}>) {
  return (
    <div className="imperial-card-stat p-4">
      <span className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
        <Icon className="size-4" />
      </span>
      <p className="mt-4 text-sm text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}
