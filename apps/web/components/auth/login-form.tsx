'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { ApiError, login } from '@/lib/api'
import { type LoginFormValues, loginSchema } from '@/lib/validation'

export function LoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isRouting, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], { user: data.user })
      queryClient.invalidateQueries({ queryKey: ['consent', 'me'] })
      startTransition(() => { router.push('/dashboard') })
    },
    onError: (error, variables) => {
      if (error instanceof ApiError && error.status === 403) {
        startTransition(() => {
          router.push(`/verificar-email?email=${encodeURIComponent(variables.email)}`)
        })
      }
    },
  })

  const onSubmit = handleSubmit((values) => { loginMutation.mutate(values) })
  const isLoading = loginMutation.isPending || isRouting

  const errorMessage =
    loginMutation.error instanceof ApiError
      ? loginMutation.error.message
      : null

  return (
    <div className="w-full space-y-8">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Entre e comande seu comércio
        </h2>
        <p className="text-sm text-white/40">
          Inicie sua sessão corporativa preenchendo as credenciais vitais abaixo.
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        {/* Email */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/50">Email Corporativo</label>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
            <Mail className="size-4 shrink-0 text-white/30" />
            <input
              autoComplete="email"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="ceo@empresa.com"
              type="email"
              {...registerField('email')}
            />
          </div>
          {errors.email?.message && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        {/* Senha */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-white/50">Senha de Acesso</label>
            <Link className="text-xs text-white/40 hover:text-white/70 transition-colors" href="/recuperar-senha">
              Esqueci a senha
            </Link>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
            <LockKeyhole className="size-4 shrink-0 text-white/30" />
            <input
              autoComplete="current-password"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              {...registerField('password')}
            />
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
          onClick={() => loginMutation.mutate({ email: 'demo@deskimperial.online', password: 'Demo@123' })}
        >
          <div>
            <p className="text-sm font-semibold text-white">Acessar Sessão Demo</p>
            <p className="text-xs text-white/40">Experimente sem compromisso</p>
          </div>
          <svg className="size-4 text-white/30" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>

      <p className="text-center text-sm text-white/40">
        Não possui uma conta?{' '}
        <Link className="font-semibold text-white underline underline-offset-4 hover:text-white/70 transition-colors" href="/cadastro">
          Solicitar acesso
        </Link>
      </p>

      <p className="text-center text-xs leading-5 text-white/20">
        Ao acessar, você atesta compromisso com os guias de uso restrito interno
        de Governança e Operação.
      </p>
    </div>
  )
}
