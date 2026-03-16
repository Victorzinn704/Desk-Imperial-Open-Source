'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError, login } from '@/lib/api'
import { type LoginFormValues, loginSchema } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'

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
      : 'Use seu email corporativo para entrar. Se o acesso ainda estiver pendente, o portal abre a validacao de email automaticamente.'

  return (
    <div>
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Entrar</p>
        <h2 className="text-3xl font-semibold text-white">Acesse sua operacao com uma sessao segura.</h2>
        <p className="text-sm leading-7 text-[var(--text-soft)]">
          Este fluxo conversa com a API real do projeto e prepara o caminho para produtos, financeiro e preferencias do usuario.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <InputField
          autoComplete="email"
          error={errors.email?.message}
          label="Email"
          placeholder="ceo@empresa.com"
          {...registerField('email')}
        />

        <InputField
          autoComplete="current-password"
          error={errors.password?.message}
          label="Senha"
          placeholder="Digite sua senha"
          type="password"
          {...registerField('password')}
        />

        <div className="flex justify-end">
          <div className="flex gap-4 text-sm font-semibold">
            <Link className="text-[var(--accent)] transition hover:text-[var(--accent-strong)]" href="/verificar-email">
              Confirmar email
            </Link>
            <Link className="text-[var(--accent)] transition hover:text-[var(--accent-strong)]" href="/recuperar-senha">
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(212,177,106,0.18)] bg-[rgba(212,177,106,0.08)] px-4 py-3 text-sm text-[var(--text-soft)]">
          <span className="font-semibold text-[var(--text-primary)]">Acesso demonstrativo para avaliacao:</span>{' '}
          use <span className="font-semibold text-[var(--text-primary)]">demo@partnerportal.com</span> com senha{' '}
          <span className="font-semibold text-[var(--text-primary)]">Demo@123</span>. Cada dispositivo tem ate 20 minutos por dia no modo demo, ou voce pode criar sua propria conta e testar tudo sem esse limite.
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(143,183,255,0.08)] px-4 py-3 text-sm text-[var(--text-soft)]">
          {errorMessage}
        </div>

        <Button fullWidth loading={loginMutation.isPending || isRouting} size="lg" type="submit">
          Entrar no portal
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-sm text-[var(--text-soft)] sm:flex-row sm:items-center sm:justify-between">
        <span>Primeiro acesso ou ambiente novo?</span>
        <Link className="font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]" href="/cadastro">
          Criar conta agora
        </Link>
      </div>
    </div>
  )
}
