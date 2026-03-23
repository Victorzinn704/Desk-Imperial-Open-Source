'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LockKeyhole, Mail } from 'lucide-react'
import { ApiError, login } from '@/lib/api'
import { type LoginFormValues, loginSchema } from '@/lib/validation'
import { Button } from '@/components/shared/button'

const inputShell =
  'flex items-center gap-2 rounded-[18px] border border-white/5 bg-[rgb(23_23_23/0.94)] px-3 py-3 shadow-[inset_2px_5px_10px_rgb(5_5_5/0.42)] transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20'

export function LoginForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isRouting, startTransition] = useTransition()
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
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

  const errorMessage =
    loginMutation.error instanceof ApiError
      ? loginMutation.error.message
      : 'Entre com seu email e sua senha. Se a conta ainda estiver pendente, o portal abre a validacao de email automaticamente.'

  return (
    <div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Entrar</p>
        <h2 className="text-xl font-semibold text-white">Acesse sua operacao com seguranca.</h2>
        <p className="text-xs leading-5 text-muted-foreground">
          Entre com seu email e senha para acessar vendas, produtos, preferencias da conta e o restante da operacao.
        </p>
      </div>

      <div className="imperial-card-soft group mt-6 p-4 transition duration-300 hover:scale-[1.01]">
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-label">Email</span>
            <span className={inputShell}>
              <Mail className="size-3.5 text-label" />
              <input
                autoComplete="email"
                className="w-full border-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="ceo@empresa.com"
                {...registerField('email')}
              />
            </span>
            {errors.email?.message ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-label">Senha</span>
            <span className={inputShell}>
              <LockKeyhole className="size-3.5 text-label" />
              <input
                autoComplete="current-password"
                className="w-full border-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Digite sua senha"
                type="password"
                {...registerField('password')}
              />
            </span>
            {errors.password?.message ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
          </label>

          <div className="flex justify-end">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <Link
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-accent transition hover:border-accent/30 hover:text-accent-strong"
                href="/verificar-email"
              >
                Confirmar email
              </Link>
              <Link
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-accent transition hover:border-accent/30 hover:text-accent-strong"
                href="/recuperar-senha"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <button
            className="group relative w-full overflow-hidden rounded-[20px] border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-left transition-all duration-300 hover:border-emerald-400/50 hover:bg-emerald-400/15 hover:shadow-[0_0_32px_rgb(52_242_127/0.14)]"
            onClick={() => loginMutation.mutate({ email: 'demo@deskimperial.online', password: 'Demo@123' })}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
                  Sessão demonstrativa
                </p>
                <p className="mt-0.5 text-xs font-semibold text-white">
                  Acessar conta demo
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Conheça o portal antes de criar sua conta
                </p>
              </div>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/15 text-emerald-400 transition-transform duration-200 group-hover:translate-x-0.5">
                <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </button>

          <div className="rounded-[20px] border border-border bg-info/10 px-3 py-3 text-xs leading-5 text-muted-foreground">
            {errorMessage}
          </div>

          <Button
            className="rounded-[20px] bg-[linear-gradient(180deg,var(--color-accent),var(--color-desk-accent-strong))] shadow-[0_18px_34px_rgb(212_177_106/0.24)]"
            fullWidth
            loading={loginMutation.isPending || isRouting}
            size="lg"
            type="submit"
          >
            Entrar no portal
          </Button>
        </form>
      </div>

      <div className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Primeiro acesso ou ambiente novo?</span>
        <Link className="font-semibold text-accent transition hover:text-accent-strong" href="/cadastro">
          Criar conta agora
        </Link>
      </div>
    </div>
  )
}
