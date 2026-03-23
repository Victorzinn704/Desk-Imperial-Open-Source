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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Entrar</p>
        <h2 className="text-xl font-semibold text-white">Acesse sua operacao com seguranca.</h2>
        <p className="text-xs leading-5 text-[var(--text-soft)]">
          Entre com seu email e senha para acessar vendas, produtos, preferencias da conta e o restante da operacao.
        </p>
      </div>

      <div className="imperial-card-soft group mt-6 p-4 transition duration-300 hover:scale-[1.01]">
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--text-muted)]">Email</span>
            <span className="flex items-center gap-2 rounded-[18px] border border-[rgba(255,255,255,0.04)] bg-[rgba(23,23,23,0.94)] px-3 py-3 shadow-[inset_2px_5px_10px_rgba(5,5,5,0.42)] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[rgba(212,177,106,0.16)]">
              <Mail className="size-3.5 text-[var(--text-muted)]" />
              <input
                autoComplete="email"
                className="w-full border-none bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-soft)]"
                placeholder="ceo@empresa.com"
                {...registerField('email')}
              />
            </span>
            {errors.email?.message ? <p className="text-xs text-[var(--danger)]">{errors.email.message}</p> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--text-muted)]">Senha</span>
            <span className="flex items-center gap-2 rounded-[18px] border border-[rgba(255,255,255,0.04)] bg-[rgba(23,23,23,0.94)] px-3 py-3 shadow-[inset_2px_5px_10px_rgba(5,5,5,0.42)] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[rgba(212,177,106,0.16)]">
              <LockKeyhole className="size-3.5 text-[var(--text-muted)]" />
              <input
                autoComplete="current-password"
                className="w-full border-none bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-soft)]"
                placeholder="Digite sua senha"
                type="password"
                {...registerField('password')}
              />
            </span>
            {errors.password?.message ? <p className="text-xs text-[var(--danger)]">{errors.password.message}</p> : null}
          </label>

          <div className="flex justify-end">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <Link
                className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[var(--accent)] transition hover:border-[rgba(212,177,106,0.18)] hover:text-[var(--accent-strong)]"
                href="/verificar-email"
              >
                Confirmar email
              </Link>
              <Link
                className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[var(--accent)] transition hover:border-[rgba(212,177,106,0.18)] hover:text-[var(--accent-strong)]"
                href="/recuperar-senha"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <button
            className="group relative w-full overflow-hidden rounded-[20px] border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.06)] px-4 py-3 text-left transition-all duration-300 hover:border-[rgba(52,242,127,0.5)] hover:bg-[rgba(52,242,127,0.12)] hover:shadow-[0_0_32px_rgba(52,242,127,0.14)]"
            onClick={() => loginMutation.mutate({ email: 'demo@deskimperial.online', password: 'Demo@123' })}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#36f57c]">
                  Sessão demonstrativa
                </p>
                <p className="mt-0.5 text-xs font-semibold text-white">
                  Acessar conta demo
                </p>
                <p className="text-[10px] text-[var(--text-soft)]">
                  Conheça o portal antes de criar sua conta
                </p>
              </div>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(52,242,127,0.3)] bg-[rgba(52,242,127,0.1)] text-[#36f57c] transition-transform duration-200 group-hover:translate-x-0.5">
                <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </button>

          <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(143,183,255,0.08)] px-3 py-3 text-xs leading-5 text-[var(--text-soft)]">
            {errorMessage}
          </div>

          <Button
            className="rounded-[20px] bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] shadow-[0_18px_34px_rgba(212,177,106,0.24)]"
            fullWidth
            loading={loginMutation.isPending || isRouting}
            size="lg"
            type="submit"
          >
            Entrar no portal
          </Button>
        </form>
      </div>

      <div className="mt-6 flex flex-col gap-3 text-sm text-[var(--text-soft)] sm:flex-row sm:items-center sm:justify-between">
        <span>Primeiro acesso ou ambiente novo?</span>
        <Link className="font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]" href="/cadastro">
          Criar conta agora
        </Link>
      </div>
    </div>
  )
}
