'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError, fetchConsentDocuments, register } from '@/lib/api'
import { saveEmailVerificationChallenge } from '@/lib/auth-challenge-storage'
import { readCookieConsentChoice } from '@/lib/cookie-consent'
import { fallbackConsentDocuments, type RegisterFormValues, registerSchema } from '@/lib/validation'

export function RegisterForm() {
  const router = useRouter()
  const [isRouting, startTransition] = useTransition()

  const {
    register: registerField,
    handleSubmit,
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

  const documents = (
    consentDocumentsQuery.data?.length ? consentDocumentsQuery.data : fallbackConsentDocuments
  ).filter((doc) => doc.required)

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

  const isLoading = registerMutation.isPending || isRouting
  const errorMessage =
    registerMutation.error instanceof ApiError
      ? registerMutation.error.message
      : null

  return (
    <div className="w-full space-y-8">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Prepare seu controle
        </h2>
        <p className="text-sm text-white/40">
          Inicie sua sessão corporativa preenchendo as credenciais vitais abaixo.
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        {/* Nome + Empresa */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/50">Nome completo</label>
            <input
              autoComplete="name"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/25 transition-colors duration-200"
              placeholder="John Doe"
              {...registerField('fullName')}
            />
            {errors.fullName?.message && <p className="text-xs text-red-400">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/50">Empresa</label>
            <input
              autoComplete="organization"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/25 transition-colors duration-200"
              placeholder="Nome do seu negócio"
              {...registerField('companyName')}
            />
            {errors.companyName?.message && <p className="text-xs text-red-400">{errors.companyName.message}</p>}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/50">Email Corporativo</label>
          <input
            autoComplete="email"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/25 transition-colors duration-200"
            placeholder="ceo@empresa.com"
            type="email"
            {...registerField('email')}
          />
          {errors.email?.message && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        {/* Senha */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/50">Senha</label>
          <input
            autoComplete="new-password"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/25 transition-colors duration-200"
            placeholder="Defina uma senha forte"
            type="password"
            {...registerField('password')}
          />
          {errors.password?.message
            ? <p className="text-xs text-red-400">{errors.password.message}</p>
            : <p className="text-xs text-white/30">Mínimo de 8 caracteres contendo maiúscula, minúscula, número e símbolo.</p>
          }
        </div>

        {/* Consentimentos */}
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Consentimentos e Segurança</h3>
            <p className="mt-1.5 text-xs leading-5 text-white/40">
              Sua conta opera sob os protocolos restritos do Desk Imperial. Ao prosseguir,
              você está ciente da arquitetura baseada em cookies HttpOnly e proteções avançadas.
            </p>
          </div>

          <div className="space-y-3">
            {documents.map((doc) => {
              if (doc.key === 'terms-of-use') {
                return (
                  <label key={doc.key} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4 cursor-pointer hover:border-white/20 transition-colors">
                    <input
                      className="mt-0.5 size-4 shrink-0 accent-white"
                      type="checkbox"
                      {...registerField('acceptTerms')}
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium text-white">{doc.title}</span>
                      <span className="block text-xs text-white/40">{doc.description}</span>
                    </span>
                  </label>
                )
              }
              if (doc.key === 'privacy-policy') {
                return (
                  <label key={doc.key} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4 cursor-pointer hover:border-white/20 transition-colors">
                    <input
                      className="mt-0.5 size-4 shrink-0 accent-white"
                      type="checkbox"
                      {...registerField('acceptPrivacy')}
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium text-white">{doc.title}</span>
                      <span className="block text-xs text-white/40">{doc.description}</span>
                    </span>
                  </label>
                )
              }
              return null
            })}
          </div>

          {(errors.acceptTerms?.message || errors.acceptPrivacy?.message) && (
            <p className="text-xs text-red-400">
              {errors.acceptTerms?.message ?? errors.acceptPrivacy?.message}
            </p>
          )}
        </div>

        {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}

        <p className="text-center text-xs leading-5 text-white/20">
          Seu cadastro compila a conta e envia uma verificação por e-mail instantes após o término.
        </p>

        <button
          className="w-full rounded-lg bg-gradient-to-b from-white to-white/80 px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? 'Criando conta...' : 'Solicitar Conta e Enviar Confirmação'}
        </button>
      </form>

      <p className="text-center text-sm text-white/40">
        Já possui uma conta?{' '}
        <Link className="font-semibold text-white underline underline-offset-4 hover:text-white/70 transition-colors" href="/login">
          Ir para o Portal
        </Link>
      </p>
    </div>
  )
}
