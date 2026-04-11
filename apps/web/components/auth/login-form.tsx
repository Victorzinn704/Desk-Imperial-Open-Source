'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import {
  ApiError,
  type AuthResponse,
  fetchCurrentUser,
  fetchFinanceSummary,
  fetchOrders,
  fetchProducts,
  login,
  loginDemo,
  type LoginPayload,
} from '@/lib/api'
import { type LoginFormValues, loginSchema } from '@/lib/validation'

function prewarmDashboardEntry(queryClient: ReturnType<typeof useQueryClient>, role: AuthResponse['user']['role']) {
  const tasks = [
    queryClient.prefetchQuery({
      queryKey: ['auth', 'me'],
      queryFn: fetchCurrentUser,
      staleTime: 30_000,
    }),
  ]

  if (role === 'OWNER') {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ['finance', 'summary'],
        queryFn: fetchFinanceSummary,
        staleTime: 60_000,
      }),
    )
  } else {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ['products'],
        queryFn: fetchProducts,
        staleTime: 5 * 60_000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['orders', 'summary'],
        queryFn: () => fetchOrders({ includeCancelled: false, includeItems: false }),
        staleTime: 30_000,
      }),
    )
  }

  void Promise.allSettled(tasks)
}

type FieldInputProps = ReturnType<ReturnType<typeof useForm<LoginFormValues>>['register']>
type FieldErrors = ReturnType<typeof useForm<LoginFormValues>>['formState']['errors']

function StaffIdentityFields({
  registerField,
  errors,
}: {
  registerField: (name: 'companyEmail' | 'employeeCode') => FieldInputProps
  errors: FieldErrors
}) {
  return (
    <>
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--text-primary)]/50" htmlFor="login-company-email">
          Email da Empresa
        </label>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
          <Mail className="size-4 shrink-0 text-[var(--text-primary)]/30" />
          <input
            autoComplete="email"
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-primary)]/20"
            id="login-company-email"
            placeholder="ceo@empresa.com"
            type="email"
            {...registerField('companyEmail')}
          />
        </div>
        {errors.companyEmail?.message ? <p className="text-xs text-red-400">{errors.companyEmail.message}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--text-primary)]/50" htmlFor="login-employee-code">
          ID do Funcionário
        </label>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
          <UserRound className="size-4 shrink-0 text-[var(--text-primary)]/30" />
          <input
            autoCapitalize="characters"
            autoComplete="username"
            className="w-full bg-transparent text-sm uppercase tracking-[0.16em] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-primary)]/20"
            id="login-employee-code"
            placeholder="VD-001"
            type="text"
            {...registerField('employeeCode')}
          />
        </div>
        {errors.employeeCode?.message ? <p className="text-xs text-red-400">{errors.employeeCode.message}</p> : null}
      </div>
    </>
  )
}

function OwnerIdentityField({
  registerField,
  errors,
}: {
  registerField: (name: 'email') => FieldInputProps
  errors: FieldErrors
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-[var(--text-primary)]/50" htmlFor="login-email">
        Email Corporativo
      </label>
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
        <Mail className="size-4 shrink-0 text-[var(--text-primary)]/30" />
        <input
          autoComplete="email"
          className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-primary)]/20"
          id="login-email"
          placeholder="ceo@empresa.com"
          type="email"
          {...registerField('email')}
        />
      </div>
      {errors.email?.message ? <p className="text-xs text-red-400">{errors.email.message}</p> : null}
    </div>
  )
}

function extractApiErrorMessage(error: unknown): string | null {
  return error instanceof ApiError ? error.message : null
}

export function LoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isRouting, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    router.prefetch('/dashboard')
    router.prefetch('/app')
  }, [router])

  const {
    register: registerField,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginMode: 'OWNER',
      email: '',
      companyEmail: '',
      employeeCode: '',
      password: '',
    },
  })
  const loginMode = useWatch({
    control,
    name: 'loginMode',
  })
  const isStaffMode = loginMode === 'STAFF'

  const loginMutation = useMutation<AuthResponse, ApiError, LoginPayload>({
    mutationFn: (payload) => login(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], { user: data.user })
      prewarmDashboardEntry(queryClient, data.user.role)
      startTransition(() => {
        router.replace('/dashboard')
      })
    },
    onError: (error, variables) => {
      if (
        error instanceof ApiError &&
        error.status === 403 &&
        variables.loginMode === 'OWNER' &&
        typeof variables.email === 'string'
      ) {
        startTransition(() => {
          router.push('/verificar-email')
        })
      }
    },
  })

  const demoLoginMutation = useMutation({
    mutationFn: loginDemo,
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], { user: data.user })
      prewarmDashboardEntry(queryClient, data.user.role)
      startTransition(() => {
        router.replace('/dashboard')
      })
    },
  })

  const setLoginMode = (mode: 'OWNER' | 'STAFF') => {
    setValue('loginMode', mode, { shouldDirty: true, shouldValidate: true })

    if (mode === 'OWNER') {
      setValue('companyEmail', '', { shouldDirty: false, shouldValidate: false })
      setValue('employeeCode', '', { shouldDirty: false, shouldValidate: false })
      return
    }

    setValue('email', '', { shouldDirty: false, shouldValidate: false })
  }

  const onSubmit = handleSubmit((values) => {
    if (values.loginMode === 'STAFF') {
      loginMutation.mutate({
        loginMode: 'STAFF',
        companyEmail: values.companyEmail,
        employeeCode: values.employeeCode,
        password: values.password,
      })
      return
    }

    loginMutation.mutate({
      loginMode: 'OWNER',
      email: values.email,
      password: values.password,
    })
  })
  const isLoading = loginMutation.isPending || demoLoginMutation.isPending || isRouting

  const errorMessage = extractApiErrorMessage(loginMutation.error) ?? extractApiErrorMessage(demoLoginMutation.error)

  return (
    <div className="w-full space-y-8">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {isStaffMode ? 'Entre na operação do dia' : 'Entre e comande seu comércio'}
        </h2>
        <p className="text-sm text-[var(--text-primary)]/40">
          {isStaffMode
            ? 'Use o e-mail da empresa, seu ID e o PIN de 6 dígitos configurado pelo dono.'
            : 'Inicie sua sessão corporativa preenchendo as credenciais vitais abaixo.'}
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          <button
            className={`flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
              !isStaffMode ? 'bg-white text-black' : 'text-[var(--text-primary)]/55 hover:text-[var(--text-primary)]'
            }`}
            type="button"
            onClick={() => setLoginMode('OWNER')}
          >
            <Building2 className="size-4" />
            Empresa
          </button>
          <button
            className={`flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
              isStaffMode ? 'bg-white text-black' : 'text-[var(--text-primary)]/55 hover:text-[var(--text-primary)]'
            }`}
            type="button"
            onClick={() => setLoginMode('STAFF')}
          >
            <UserRound className="size-4" />
            Funcionário
          </button>
        </div>

        <input type="hidden" {...registerField('loginMode')} />

        {isStaffMode ? (
          <StaffIdentityFields errors={errors} registerField={registerField} />
        ) : (
          <OwnerIdentityField errors={errors} registerField={registerField} />
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--text-primary)]/50" htmlFor="login-password">
              {isStaffMode ? 'PIN de acesso' : 'Senha de Acesso'}
            </label>
            {!isStaffMode && (
              <Link
                className="text-xs text-[var(--text-primary)]/40 hover:text-[var(--text-primary)]/70 transition-colors"
                href="/recuperar-senha"
              >
                Esqueci a senha
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
            <LockKeyhole className="size-4 shrink-0 text-[var(--text-primary)]/30" />
            {isStaffMode ? (
              <input
                autoComplete="current-password"
                className="w-full bg-transparent text-sm tracking-[0.3em] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-primary)]/20"
                id="login-password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                type={showPassword ? 'text' : 'password'}
                {...registerField('password')}
              />
            ) : (
              <input
                autoComplete="current-password"
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-primary)]/20"
                id="login-password"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                {...registerField('password')}
              />
            )}
            <button
              className="shrink-0 text-[var(--text-primary)]/30 hover:text-[var(--text-primary)]/60 transition-colors"
              type="button"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password?.message && <p className="text-xs text-red-400">{errors.password.message}</p>}
        </div>

        {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}

        {/* Botão principal */}
        <button
          className="w-full rounded-lg bg-gradient-to-b from-white to-white/80 px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? 'Entrando...' : 'Entrar no portal'}
        </button>

        <button
          className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4 text-left transition-colors duration-200 hover:border-white/20 disabled:opacity-50"
          disabled={isLoading}
          type="button"
          onClick={() => {
            if (isStaffMode) {
              demoLoginMutation.mutate({ loginMode: 'STAFF', employeeCode: 'VD-001' })
              return
            }

            demoLoginMutation.mutate({ loginMode: 'OWNER' })
          }}
        >
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Acessar Sessão Demo {isStaffMode ? 'Funcionário' : 'Empresa'}
            </p>
            <p className="text-xs text-[var(--text-primary)]/40">Experimente sem compromisso</p>
          </div>
          <svg
            className="size-4 text-[var(--text-primary)]/30"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>

      <p className="text-center text-sm text-[var(--text-primary)]/40">
        Não possui uma conta?{' '}
        <Link
          className="font-semibold text-[var(--text-primary)] underline underline-offset-4 hover:text-[var(--text-primary)]/70 transition-colors"
          href="/cadastro"
        >
          Solicitar acesso
        </Link>
      </p>

      <p className="text-center text-xs leading-5 text-[var(--text-primary)]/20">
        Ao acessar, você atesta compromisso com os guias de uso restrito interno de Governança e Operação.
      </p>
    </div>
  )
}
