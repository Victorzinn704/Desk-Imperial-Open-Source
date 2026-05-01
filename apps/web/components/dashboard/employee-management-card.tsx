'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  BadgeCheck,
  BadgeMinus,
  IdCard,
  KeyRound,
  type LucideIcon,
  RefreshCcw,
  ShieldUser,
  UserPlus,
  Users,
} from 'lucide-react'
import { AdminPinDialog } from '@/components/admin-pin/admin-pin-dialog'
import { useAdminPin } from '@/components/admin-pin/use-admin-pin'
import { fetchAdminPinStatus } from '@/lib/admin-pin'
import type { EmployeeAccessCredentials, EmployeeRecord } from '@/lib/api'
import { type EmployeeFormValues, employeeSchema } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'

const emptyValues: EmployeeFormValues = {
  displayName: '',
}

type IssuedAccessState = {
  displayName: string
  credentials: EmployeeAccessCredentials
}

export function EmployeeManagementCard({
  busy = false,
  employees,
  error = null,
  loading = false,
  onArchive,
  onCreate,
  onIssueAccess,
  onRotatePassword,
  onRevokeAccess,
  onRestore,
  totals,
}: Readonly<{
  busy?: boolean
  employees: EmployeeRecord[]
  error?: string | null
  loading?: boolean
  onArchive: (employeeId: string) => void
  onCreate: (
    values: EmployeeFormValues,
  ) => Promise<{ employee: EmployeeRecord; credentials: EmployeeAccessCredentials }>
  onIssueAccess: (employeeId: string) => Promise<{ employee: EmployeeRecord; credentials: EmployeeAccessCredentials }>
  onRotatePassword: (
    employeeId: string,
  ) => Promise<{ employee: EmployeeRecord; credentials: EmployeeAccessCredentials }>
  onRevokeAccess: (employeeId: string) => Promise<{ employee: EmployeeRecord }>
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
  const [issuedAccess, setIssuedAccess] = useState<IssuedAccessState | null>(null)
  const [pinProtectionEnabled, setPinProtectionEnabled] = useState(false)
  const pin = useAdminPin()

  useEffect(() => {
    let mounted = true

    void fetchAdminPinStatus()
      .then((response) => {
        if (mounted) {
          setPinProtectionEnabled(response.configured)
        }
      })
      .catch(() => {
        if (mounted) {
          setPinProtectionEnabled(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  async function runProtectedAction<T>(
    action: () => Promise<T>,
    options: { title: string; description: string },
  ): Promise<T> {
    if (!pinProtectionEnabled) {
      return action()
    }

    return new Promise<T>((resolve, reject) => {
      pin.requirePin(
        () => {
          void action().then(resolve).catch(reject)
        },
        {
          title: options.title,
          description: options.description,
          onCancel: () => reject(new Error('PIN_VERIFICATION_CANCELLED')),
        },
      )
    })
  }

  async function handleProtectedCreate(values: EmployeeFormValues) {
    try {
      const response = await runProtectedAction(() => onCreate(values), {
        title: 'Emitir acesso do funcionário',
        description: 'Confirme o PIN para cadastrar o funcionário e liberar o acesso operacional.',
      })
      setIssuedAccess({
        displayName: response.employee.displayName,
        credentials: response.credentials,
      })
      reset(emptyValues)
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'PIN_VERIFICATION_CANCELLED') {
        return
      }
    }
  }

  return (
    <article className="imperial-card p-7">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
          <ShieldUser className="size-5" />
        </span>
        <div>
          <p className="text-sm text-[var(--text-soft)]">Equipe comercial</p>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Funcionários vinculados à venda</h2>
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
        onSubmit={handleSubmit(async (values) => {
          await handleProtectedCreate(values)
        })}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            error={errors.displayName?.message}
            label="Nome do funcionário"
            placeholder="Ana Martins"
            {...register('displayName')}
          />
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
            O sistema gera automaticamente um ID alfanumérico de 6 caracteres e uma senha numérica de 8 dígitos.
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-xs leading-6 text-[var(--text-soft)]">
          Login do funcionário: e-mail principal da empresa + ID de acesso + senha de 8 dígitos.
          <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-[var(--info)]">
            {pinProtectionEnabled ? 'Fluxo protegido por PIN administrativo.' : 'Sem PIN ativo no momento.'}
          </span>
        </div>

        <Button fullWidth loading={loading} type="submit">
          <UserPlus className="size-4" />
          Cadastrar e gerar acesso
        </Button>
      </form>

      {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
      {issuedAccess ? (
        <div className="mt-4 rounded-2xl border border-[rgba(96,165,250,0.28)] bg-[rgba(96,165,250,0.08)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--info)]">Credencial emitida</p>
          <p className="mt-2 text-sm text-[var(--text-primary)]">{issuedAccess.displayName}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-soft)]">ID de acesso</p>
              <p className="mt-1 font-mono text-base text-[var(--text-primary)]">
                {issuedAccess.credentials.employeeCode}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-soft)]">Senha inicial</p>
              <p className="mt-1 font-mono text-base text-[var(--text-primary)]">
                {issuedAccess.credentials.temporaryPassword}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--text-soft)]">
            Mostre isso ao funcionário agora. A senha não volta a ser exibida depois.
          </p>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {employees.length ? (
          employees.map((employee) => (
            <div className="imperial-card-soft p-4" key={employee.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
                    <IdCard className="size-4" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-medium text-[var(--text-primary)]">{employee.displayName}</p>
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
                    <p className="mt-2 text-sm text-[var(--text-soft)]">ID de acesso {employee.employeeCode}</p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                      {employee.hasLogin ? 'Acesso individual ativo' : 'Sem acesso individual'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {employee.active ? (
                    <>
                      <Button
                        disabled={busy}
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          try {
                            const response = await runProtectedAction(() => onIssueAccess(employee.id), {
                              title: employee.hasLogin ? 'Reemitir acesso completo' : 'Gerar acesso do funcionário',
                              description: employee.hasLogin
                                ? 'Confirme o PIN para trocar o ID de acesso e a senha do funcionário.'
                                : 'Confirme o PIN para gerar o ID operacional e a senha inicial do funcionário.',
                            })
                            setIssuedAccess({
                              displayName: response.employee.displayName,
                              credentials: response.credentials,
                            })
                          } catch (error) {
                            if (!(error instanceof Error) || error.message !== 'PIN_VERIFICATION_CANCELLED') {
                              return
                            }
                          }
                        }}
                      >
                        <KeyRound className="size-4" />
                        {employee.hasLogin ? 'Reemitir acesso' : 'Gerar acesso'}
                      </Button>
                      {employee.hasLogin ? (
                        <>
                          <Button
                            disabled={busy}
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                const response = await runProtectedAction(() => onRotatePassword(employee.id), {
                                  title: 'Rotacionar senha',
                                  description: 'Confirme o PIN para trocar só a senha, mantendo o mesmo ID de acesso.',
                                })
                                setIssuedAccess({
                                  displayName: response.employee.displayName,
                                  credentials: response.credentials,
                                })
                              } catch (error) {
                                if (!(error instanceof Error) || error.message !== 'PIN_VERIFICATION_CANCELLED') {
                                  return
                                }
                              }
                            }}
                          >
                            <RefreshCcw className="size-4" />
                            Rotacionar senha
                          </Button>
                          <Button
                            disabled={busy}
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await runProtectedAction(() => onRevokeAccess(employee.id), {
                                  title: 'Revogar acesso',
                                  description: 'Confirme o PIN para desativar o acesso individual deste funcionário.',
                                })
                              } catch (error) {
                                if (!(error instanceof Error) || error.message !== 'PIN_VERIFICATION_CANCELLED') {
                                  return
                                }
                              }
                            }}
                          >
                            <BadgeMinus className="size-4" />
                            Revogar acesso
                          </Button>
                        </>
                      ) : null}
                      <Button disabled={busy} size="sm" variant="ghost" onClick={() => onArchive(employee.id)}>
                        <BadgeMinus className="size-4" />
                        Arquivar
                      </Button>
                    </>
                  ) : (
                    <Button disabled={busy} size="sm" variant="secondary" onClick={() => onRestore(employee.id)}>
                      <BadgeCheck className="size-4" />
                      Reativar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="imperial-card-soft border-dashed px-5 py-8 text-center">
            <p className="text-sm leading-7 text-[var(--text-soft)]">
              Cadastre o funcionário. O sistema emite o ID de acesso e a senha operacional logo em seguida.
            </p>
          </div>
        )}
      </div>
      {pin.pinDialogOpen ? (
        <AdminPinDialog
          description={pin.pinDialogDescription}
          title={pin.pinDialogTitle}
          onCancel={pin.handlePinCancel}
          onConfirm={pin.handlePinConfirm}
        />
      ) : null}
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
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}
