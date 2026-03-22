'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { ApiError, login } from '@/lib/api'
import { type LoginFormValues, loginSchema } from '@/lib/validation'
import { Button } from '@/components/shared/button'

const inputShell =
  'flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2.5 transition focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground'

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
      startTransition(() => {
        router.push('/dashboard')
      })
    },
    onError: (error, variables) => {
      if (error instanceof ApiError && error.status === 403) {
        startTransition(() => {
          router.push(`/verificar-email?email=${encodeURIComponent(variables.email)}`)
        })
      }
    },
  })

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate(values)
  })

  const apiError = loginMutation.isError
    ? loginMutation.error instanceof ApiError
      ? loginMutation.error.message
      : 'Não foi possível conectar. Verifique sua conexão e tente novamente.'
    : null

  return (
    <div className="w-full">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Email Corporativo
          </label>
          <div className={inputShell}>
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <input
              id="email"
              autoComplete="email"
              className="w-full border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="ceo@empresa.com"
              {...registerField('email')}
            />
          </div>
          {errors.email?.message ? (
            <p className="flex items-center gap-1.5 text-xs text-destructive mt-1">
              <AlertCircle className="size-3 shrink-0" />
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              Senha de Acesso
            </label>
            <Link
              className="text-xs text-muted-foreground transition hover:text-foreground"
              href="/recuperar-senha"
            >
              Esqueci a senha
            </Link>
          </div>
          <div className={inputShell}>
            <LockKeyhole className="size-4 shrink-0 text-muted-foreground" />
            <input
              id="password"
              autoComplete="current-password"
              className="w-full border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              {...registerField('password')}
            />
            <button
              className="ml-auto shrink-0 text-muted-foreground transition hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              type="button"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password?.message ? (
            <p className="flex items-center gap-1.5 text-xs text-destructive mt-1">
              <AlertCircle className="size-3 shrink-0" />
              {errors.password.message}
            </p>
          ) : null}
        </div>

        {apiError ? (
          <div className="flex items-start gap-2.5 rounded-md border border-destructive/20 bg-destructive/10 px-3.5 py-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm leading-5 text-destructive/90">{apiError}</p>
          </div>
        ) : null}

        <Button
          className="w-full mt-2"
          loading={loginMutation.isPending || isRouting}
          size="md"
          variant="primary"
          type="submit"
        >
          Entrar no portal
        </Button>

        {/* Demo Account Button Simplified */}
        <button
          className="group relative w-full flex items-center justify-between mt-3 rounded-md border border-border bg-card px-4 py-3 text-left transition-all hover:bg-muted hover:border-muted-foreground/20"
          onClick={() => loginMutation.mutate({ email: 'demo@deskimperial.online', password: 'Demo@123' })}
          type="button"
        >
          <div>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Acessar Sessão Demo</p>
            <p className="text-xs text-muted-foreground">Experimente sem compromisso</p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </form>

      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Não possui uma conta?</span>
        <Link className="font-medium text-foreground hover:underline" href="/cadastro">
          Solicitar acesso
        </Link>
      </div>
    </div>
  )
}
