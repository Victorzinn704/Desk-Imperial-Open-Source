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
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Entrar</p>
        <h2 className="text-3xl font-semibold text-white">Acesse sua operacao com seguranca.</h2>
        <p className="text-sm leading-7 text-[var(--text-soft)]">
          Entre com seu email e senha para acessar vendas, produtos, preferencias da conta e o restante da operacao.
        </p>
      </div>

      <div className="group mt-8 rounded-[28px] border border-[rgba(255,255,255,0.06)] bg-[rgba(9,12,16,0.88)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_70px_rgba(0,0,0,0.34)] transition duration-300 hover:scale-[1.01] hover:border-[rgba(212,177,106,0.2)]">
        <form className="space-y-5" onSubmit={onSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">Email</span>
            <span className="flex items-center gap-3 rounded-[22px] border border-[rgba(255,255,255,0.04)] bg-[rgba(23,23,23,0.94)] px-4 py-4 shadow-[inset_2px_5px_10px_rgba(5,5,5,0.42)] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[rgba(212,177,106,0.16)]">
              <Mail className="size-4 text-[var(--text-muted)]" />
              <input
                autoComplete="email"
                className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-soft)]"
                placeholder="ceo@empresa.com"
                {...registerField('email')}
              />
            </span>
            {errors.email?.message ? <p className="text-sm text-[var(--danger)]">{errors.email.message}</p> : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">Senha</span>
            <span className="flex items-center gap-3 rounded-[22px] border border-[rgba(255,255,255,0.04)] bg-[rgba(23,23,23,0.94)] px-4 py-4 shadow-[inset_2px_5px_10px_rgba(5,5,5,0.42)] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[rgba(212,177,106,0.16)]">
              <LockKeyhole className="size-4 text-[var(--text-muted)]" />
              <input
                autoComplete="current-password"
                className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-soft)]"
                placeholder="Digite sua senha"
                type="password"
                {...registerField('password')}
              />
            </span>
            {errors.password?.message ? <p className="text-sm text-[var(--danger)]">{errors.password.message}</p> : null}
          </label>

          <div className="flex justify-end">
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <Link
                className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-[var(--accent)] transition hover:border-[rgba(212,177,106,0.18)] hover:text-[var(--accent-strong)]"
                href="/verificar-email"
              >
                Confirmar email
              </Link>
              <Link
                className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-[var(--accent)] transition hover:border-[rgba(212,177,106,0.18)] hover:text-[var(--accent-strong)]"
                href="/recuperar-senha"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-[rgba(212,177,106,0.18)] bg-[rgba(212,177,106,0.08)] px-4 py-4 text-sm leading-7 text-[var(--text-soft)]">
            <span className="font-semibold text-[var(--text-primary)]">Acesso demonstrativo:</span>{' '}
            use <span className="font-semibold text-[var(--text-primary)]">demo@partnerportal.com</span> com senha{' '}
            <span className="font-semibold text-[var(--text-primary)]">Demo@123</span>. Se preferir, crie sua propria conta e entre direto no portal.
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(143,183,255,0.08)] px-4 py-4 text-sm leading-7 text-[var(--text-soft)]">
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
