'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError, fetchConsentDocuments, register } from '@/lib/api'
import { readCookieConsentChoice } from '@/lib/cookie-consent'
import { fallbackConsentDocuments, getPasswordStrength, type RegisterFormValues, registerSchema } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import { CheckboxField } from '@/components/shared/checkbox-field'
import { InputField } from '@/components/shared/input-field'

export function RegisterForm() {
  const router = useRouter()
  const [isRouting, startTransition] = useTransition()
  const {
    register: registerField,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      companyName: '',
      email: '',
      password: '',
      acceptTerms: false,
      acceptPrivacy: false,
    },
  })

  const consentDocumentsQuery = useQuery({
    queryKey: ['consent', 'documents'],
    queryFn: fetchConsentDocuments,
    retry: 0,
  })

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      startTransition(() => {
        router.push(`/verificar-email?email=${encodeURIComponent(data.email)}`)
      })
    },
  })

  const password =
    useWatch({
      control,
      name: 'password',
    }) ?? ''
  const passwordStrength = getPasswordStrength(password)
  const documents = (
    consentDocumentsQuery.data?.length ? consentDocumentsQuery.data : fallbackConsentDocuments
  ).filter((document) => document.required)

  const onSubmit = handleSubmit((values) => {
    const cookieConsentChoice = readCookieConsentChoice()

    registerMutation.mutate({
      fullName: values.fullName,
      companyName: values.companyName || undefined,
      email: values.email,
      password: values.password,
      acceptTerms: values.acceptTerms,
      acceptPrivacy: values.acceptPrivacy,
      analyticsCookies: cookieConsentChoice === 'accepted',
      marketingCookies: cookieConsentChoice === 'accepted',
    })
  })

  const errorMessage =
    registerMutation.error instanceof ApiError
      ? registerMutation.error.message
      : 'Seu cadastro cria a conta, registra os consentimentos e envia um codigo para confirmar o email antes do primeiro acesso.'

  return (
    <div>
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Cadastro</p>
        <h2 className="text-3xl font-semibold text-white">Crie uma conta pronta para operar com seguranca.</h2>
        <p className="text-sm leading-7 text-[var(--text-soft)]">
          O cadastro ja considera os documentos legais e a base de sessao por cookie HttpOnly.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <InputField
            autoComplete="name"
            error={errors.fullName?.message}
            label="Nome completo"
            placeholder="Lucia Helena"
            {...registerField('fullName')}
          />
          <InputField
            autoComplete="organization"
            error={errors.companyName?.message}
            label="Empresa"
            placeholder="Portal da sua empresa"
            {...registerField('companyName')}
          />
        </div>

        <InputField
          autoComplete="email"
          error={errors.email?.message}
          label="Email"
          placeholder="ceo@empresa.com"
          {...registerField('email')}
        />

        <div className="space-y-3">
          <InputField
            autoComplete="new-password"
            error={errors.password?.message}
            hint="Minimo de 8 caracteres com maiuscula, minuscula, numero e caractere especial."
            label="Senha"
            placeholder="Defina uma senha forte"
            type="password"
            {...registerField('password')}
          />

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-soft)]">Forca da senha</span>
              <span className="font-semibold text-[var(--text-primary)]">{passwordStrength.label}</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <span
                  className={`h-2 rounded-full ${
                    index < passwordStrength.score ? 'bg-[var(--accent)]' : 'bg-[rgba(255,255,255,0.08)]'
                  }`}
                  key={index}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Consentimento legal</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              Para criar a conta, os documentos obrigatorios precisam ser aceitos. As preferencias de cookies ficam no banner do site.
            </p>
          </div>

          <div className="grid gap-3">
            {documents.map((document) => {
              if (document.key === 'terms-of-use') {
                return (
                  <CheckboxField
                    description={document.description}
                    error={errors.acceptTerms?.message}
                    key={document.key}
                    label={document.title}
                    {...registerField('acceptTerms')}
                  />
                )
              }

              if (document.key === 'privacy-policy') {
                return (
                  <CheckboxField
                    description={document.description}
                    error={errors.acceptPrivacy?.message}
                    key={document.key}
                    label={document.title}
                    {...registerField('acceptPrivacy')}
                  />
                )
              }

              return null
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(143,183,255,0.08)] px-4 py-3 text-sm text-[var(--text-soft)]">
          {errorMessage}
        </div>

        <Button fullWidth loading={registerMutation.isPending || isRouting} size="lg" type="submit">
          Criar conta e confirmar email
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-sm text-[var(--text-soft)] sm:flex-row sm:items-center sm:justify-between">
        <span>Ja existe uma conta criada?</span>
        <Link className="font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]" href="/login">
          Voltar para login
        </Link>
      </div>
    </div>
  )
}
