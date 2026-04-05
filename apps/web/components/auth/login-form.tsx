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
  fetchCurrentUser,
  fetchFinanceSummary,
  fetchOrders,
  fetchProducts,
  login,
  loginDemo,
  type AuthResponse,
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

  const errorMessage =
    (loginMutation.error instanceof ApiError ? loginMutation.error.message : null) ??
    (demoLoginMutation.error instanceof ApiError ? demoLoginMutation.error.message : null)

  return (
    <div className="w-full space-y-8">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          {isStaffMode ? 'Entre na operação do dia' : 'Entre e comande seu comércio'}
        </h2>
        <p className="text-sm text-white/40">
          {isStaffMode
            ? 'Use o e-mail da empresa, seu ID e o PIN de 6 dígitos configurado pelo dono.'
            : 'Inicie sua sessão corporativa preenchendo as credenciais vitais abaixo.'}
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button
            className={`flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
              !isStaffMode ? 'bg-white text-black' : 'text-white/55 hover:text-white'
            }`}
            type="button"
            onClick={() => setLoginMode('OWNER')}
          >
            <Building2 className="size-4" />
            Empresa
          </button>
          <button
            className={`flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
              isStaffMode ? 'bg-white text-black' : 'text-white/55 hover:text-white'
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
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/50" htmlFor="login-company-email">
                Email da Empresa
              </label>
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
                <Mail className="size-4 shrink-0 text-white/30" />
                <input
                  autoComplete="email"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                  id="login-company-email"
                  placeholder="ceo@empresa.com"
                  type="email"
                  {...registerField('companyEmail')}
                />
              </div>
              {errors.companyEmail?.message ? (
                <p className="text-xs text-red-400">{errors.companyEmail.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-white/50" htmlFor="login-employee-code">
                ID do Funcionário
              </label>
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
                <UserRound className="size-4 shrink-0 text-white/30" />
                <input
                  autoCapitalize="characters"
                  autoComplete="username"
                  className="w-full bg-transparent text-sm uppercase tracking-[0.16em] text-white outline-none placeholder:text-white/20"
                  id="login-employee-code"
                  placeholder="VD-001"
                  type="text"
                  {...registerField('employeeCode')}
                />
              </div>
              {errors.employeeCode?.message ? (
                <p className="text-xs text-red-400">{errors.employeeCode.message}</p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/50" htmlFor="login-email">
              Email Corporativo
            </label>
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
              <Mail className="size-4 shrink-0 text-white/30" />
              <input
                autoComplete="email"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                id="login-email"
                placeholder="ceo@empresa.com"
                type="email"
                {...registerField('email')}
              />
            </div>
            {errors.email?.message ? <p className="text-xs text-red-400">{errors.email.message}</p> : null}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-white/50" htmlFor="login-password">
              {isStaffMode ? 'PIN de acesso' : 'Senha de Acesso'}
            </label>
            {!isStaffMode && (
              <Link className="text-xs text-white/40 hover:text-white/70 transition-colors" href="/recuperar-senha">
                Esqueci a senha
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
            <LockKeyhole className="size-4 shrink-0 text-white/30" />
            {isStaffMode ? (
              <input
                autoComplete="current-password"
                className="w-full bg-transparent text-sm tracking-[0.3em] text-white outline-none placeholder:text-white/20"
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
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                id="login-password"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                {...registerField('password')}
              />
            )}
            <button
              className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
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

        {/* Demo */}
        <button
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-5 py-4 text-left transition-colors duration-200 hover:border-white/20"
          type="button"
          onClick={() => {
            if (isStaffMode) {
              demoLoginMutation.mutate({ loginMode: 'STAFF', employeeCode: 'VD-001' })
            } else {
              demoLoginMutation.mutate({ loginMode: 'OWNER' })
            }
          }}
        >
          <div>
            <p className="text-sm font-semibold text-white">
              Acessar Sessão Demo {isStaffMode ? 'Funcionário' : 'Empresa'}
            </p>
            <p className="text-xs text-white/40">Experimente sem compromisso</p>
          </div>
          <svg className="size-4 text-white/30" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>

      <p className="text-center text-sm text-white/40">
        Não possui uma conta?{' '}
        <Link
          className="font-semibold text-white underline underline-offset-4 hover:text-white/70 transition-colors"
          href="/cadastro"
        >
          Solicitar acesso
        </Link>
      </p>

      <p className="text-center text-xs leading-5 text-white/20">
        Ao acessar, você atesta compromisso com os guias de uso restrito interno de Governança e Operação.
      </p>
    </div>
  )
}
