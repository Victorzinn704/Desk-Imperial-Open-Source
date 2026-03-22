'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError, fetchConsentDocuments, register } from '@/lib/api'
import { saveEmailVerificationChallenge } from '@/lib/auth-challenge-storage'
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
      if (data.deliveryMode === 'preview' && data.previewCode && data.previewExpiresAt) {
        saveEmailVerificationChallenge({
          email: data.email,
          previewCode: data.previewCode,
          previewExpiresAt: data.previewExpiresAt,
          savedAt: new Date().toISOString(),
        })
      }

      startTransition(() => {
        router.push(`/verificar-email?email=${encodeURIComponent(data.email)}&new=1`)
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
      : 'Seu cadastro compila a conta e envia uma verificação por e-mail instantes após o término.'

  return (
    <div className="w-full">
      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            autoComplete="name"
            error={errors.fullName?.message}
            label="Nome completo"
            placeholder="John Doe"
            {...registerField('fullName')}
          />
          <InputField
            autoComplete="organization"
            error={errors.companyName?.message}
            label="Empresa"
            placeholder="Nome do seu negócio"
            {...registerField('companyName')}
          />
        </div>

        <InputField
          autoComplete="email"
          error={errors.email?.message}
          label="Email Corporativo"
          placeholder="ceo@empresa.com"
          {...registerField('email')}
        />

        <div className="space-y-3">
          <InputField
            autoComplete="new-password"
            error={errors.password?.message}
            hint="Mínimo de 8 caracteres contendo maiúscula, minúscula, número e símbolo."
            label="Senha"
            placeholder="Defina uma senha forte"
            type="password"
            {...registerField('password')}
          />

          {password.length > 0 && (
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Força da senha estimado:</span>
                <span className="font-semibold text-foreground tracking-wide">{passwordStrength.label}</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <span
                    className={`h-1.5 rounded-full transition-colors ${
                      index < passwordStrength.score ? 'bg-primary' : 'bg-muted'
                    }`}
                    key={index}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-background p-5 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Consentimentos e Segurança</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Sua conta opera sob os protocolos restritos do Desk Imperial. Ao prosseguir, 
              você está ciente da arquitetura baseada em cookies HttpOnly e proteções avançadas.
            </p>
          </div>

          <div className="grid gap-3 pt-2">
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

        <div className="rounded-md border border-muted bg-muted/30 px-4 py-3 text-xs text-muted-foreground leading-relaxed text-center">
          {errorMessage}
        </div>

        <Button className="w-full" loading={registerMutation.isPending || isRouting} size="md" variant="primary" type="submit">
          Solicitar Conta e Enviar Confirmação
        </Button>
      </form>

      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Já possui uma governança ativa?</span>
        <Link className="font-medium text-foreground hover:underline" href="/login">
          Ir para o Portal
        </Link>
      </div>
    </div>
  )
}
