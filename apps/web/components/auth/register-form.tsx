'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, Building2, Eye, EyeOff, Globe2, Hash, LockKeyhole, Mail, MapPin, User, Users } from 'lucide-react'
import { ApiError, fetchConsentDocuments, lookupPostalCode, register } from '@/lib/api'
import { saveEmailVerificationChallenge } from '@/lib/auth-challenge-storage'
import { readCookieConsentChoice } from '@/lib/cookie-consent'
import {
  fallbackConsentDocuments,
  type RegisterFormInputValues,
  type RegisterFormValues,
  registerSchema,
} from '@/lib/validation'

export function RegisterForm() {
  const router = useRouter()
  const [isRouting, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [postalCodeFeedback, setPostalCodeFeedback] = useState<string | null>(null)
  const [lastPostalCodeLookup, setLastPostalCodeLookup] = useState<string | null>(null)

  const {
    register: registerField,
    handleSubmit,
    setError,
    clearErrors,
    getValues,
    setFocus,
    setValue,
    control,
    formState: { errors },
  } = useForm<RegisterFormInputValues, undefined, RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      companyName: '',
      email: '',
      companyStreetLine1: '',
      companyStreetNumber: '',
      companyAddressComplement: '',
      companyDistrict: '',
      companyCity: '',
      companyState: '',
      companyPostalCode: '',
      companyCountry: 'Brasil',
      hasEmployees: false,
      employeeCount: 0,
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

  const documents = (consentDocumentsQuery.data?.length ? consentDocumentsQuery.data : fallbackConsentDocuments).filter(
    (doc) => doc.required,
  )

  const passwordValue = useWatch({
    control,
    name: 'password',
  })
  const postalCodeValue = useWatch({
    control,
    name: 'companyPostalCode',
  })
  const hasEmployees = useWatch({
    control,
    name: 'hasEmployees',
  })
  const postalCodeFieldRegistration = registerField('companyPostalCode', {
    onChange: (event) => {
      event.target.value = formatPostalCodeValue(event.target.value)
      if (normalizePostalCode(event.target.value) === null) {
        setLastPostalCodeLookup(null)
      }
      setPostalCodeFeedback(null)
      clearErrors('companyPostalCode')
    },
  })

  const { isPending: isPostalCodeLookupPending, mutate: mutatePostalCodeLookup } = useMutation({
    mutationFn: lookupPostalCode,
    onSuccess: (data, requestedPostalCode) => {
      if (normalizePostalCode(getValues('companyPostalCode')) !== normalizePostalCode(requestedPostalCode)) {
        return
      }

      setValue('companyPostalCode', data.postalCode, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })

      if (data.streetLine1) {
        setValue('companyStreetLine1', data.streetLine1, { shouldDirty: true, shouldValidate: true })
      }

      if (data.addressComplement && !getValues('companyAddressComplement')?.trim()) {
        setValue('companyAddressComplement', data.addressComplement, { shouldDirty: true, shouldValidate: true })
      }

      if (data.district) {
        setValue('companyDistrict', data.district, { shouldDirty: true, shouldValidate: true })
      }

      if (data.city) {
        setValue('companyCity', data.city, { shouldDirty: true, shouldValidate: true })
      }

      if (data.state) {
        setValue('companyState', data.state, { shouldDirty: true, shouldValidate: true })
      }

      setValue('companyCountry', data.country, { shouldDirty: true, shouldValidate: true })
      clearErrors(['companyPostalCode', 'companyStreetLine1', 'companyDistrict', 'companyCity', 'companyState'])
      setPostalCodeFeedback('CEP validado. Rua, bairro, cidade e UF foram preenchidos.')

      if (!getValues('companyStreetNumber')?.trim()) {
        setFocus('companyStreetNumber')
      }
    },
    onError: (error, requestedPostalCode) => {
      if (normalizePostalCode(getValues('companyPostalCode')) !== normalizePostalCode(requestedPostalCode)) {
        return
      }

      setPostalCodeFeedback(null)
      setError('companyPostalCode', {
        type: 'manual',
        message: error instanceof ApiError ? error.message : 'Nao foi possivel consultar esse CEP agora.',
      })
    },
  })

  useEffect(() => {
    const normalizedPostalCode = normalizePostalCode(postalCodeValue)

    if (!normalizedPostalCode) {
      return
    }

    if (normalizedPostalCode === lastPostalCodeLookup) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setLastPostalCodeLookup(normalizedPostalCode)
      mutatePostalCodeLookup(formatPostalCodeValue(normalizedPostalCode))
    }, 350)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [lastPostalCodeLookup, mutatePostalCodeLookup, postalCodeValue])

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null)

    if (values.password !== confirmPassword) {
      setError('password', { type: 'manual', message: 'As senhas precisam ser iguais.' })
      setSubmitError('As senhas não coincidem.')
      return
    }

    clearErrors('password')

    const cookieConsentChoice = readCookieConsentChoice()

    registerMutation.mutate(
      {
        fullName: values.fullName,
        companyName: values.companyName || undefined,
        email: values.email,
        companyStreetLine1: values.companyStreetLine1,
        companyStreetNumber: values.companyStreetNumber,
        companyAddressComplement: values.companyAddressComplement || undefined,
        companyDistrict: values.companyDistrict,
        companyCity: values.companyCity,
        companyState: values.companyState,
        companyPostalCode: values.companyPostalCode,
        companyCountry: values.companyCountry,
        hasEmployees: values.hasEmployees,
        employeeCount: values.employeeCount,
        password: values.password,
        acceptTerms: values.acceptTerms,
        acceptPrivacy: values.acceptPrivacy,
        analyticsCookies: cookieConsentChoice === 'accepted',
        marketingCookies: cookieConsentChoice === 'accepted',
      },
      {
        onError: (error) => {
          setSubmitError(error instanceof ApiError ? error.message : 'Não foi possível criar a conta.')
        },
      },
    )
  })

  const isLoading = registerMutation.isPending || isRouting
  const confirmPasswordError =
    confirmPassword && passwordValue !== confirmPassword ? 'As senhas precisam ser iguais.' : null
  const passwordHint = errors.password?.message ?? '12+ caracteres com maiúscula, minúscula, número e símbolo.'

  return (
    <div className="w-full space-y-4">
      <div className="space-y-1">
        <h2 className="text-[1.7rem] font-semibold tracking-tight text-white">Crie sua empresa e ative o acesso</h2>
        <p className="text-[13px] leading-5 text-white/40">
          Cadastre responsável, endereço exato e estrutura da equipe antes da validação por e-mail.
        </p>
      </div>

      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          <FieldShell error={errors.fullName?.message} icon={User} label="Responsável pela Conta">
            <input
              autoComplete="name"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="Seu nome completo"
              type="text"
              {...registerField('fullName')}
            />
          </FieldShell>

          <FieldShell error={errors.companyName?.message} icon={Building2} label="Empresa">
            <input
              autoComplete="organization"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="Nome da empresa"
              type="text"
              {...registerField('companyName')}
            />
          </FieldShell>

          <FieldShell error={errors.email?.message} icon={Mail} label="Email Corporativo">
            <input
              autoComplete="email"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="ceo@empresa.com"
              type="email"
              {...registerField('email')}
            />
          </FieldShell>
        </div>

        <div className="grid gap-2.5 md:grid-cols-[minmax(132px,0.62fr)_minmax(0,1.45fr)] xl:grid-cols-[minmax(132px,0.55fr)_minmax(0,1.55fr)_minmax(100px,0.38fr)]">
          <FieldShell
            error={errors.companyPostalCode?.message}
            hint={
              isPostalCodeLookupPending
                ? 'Consultando endereco pelo CEP...'
                : (postalCodeFeedback ?? 'Informe um CEP valido para preencher rua, bairro, cidade e UF.')
            }
            icon={Hash}
            label="CEP"
          >
            <input
              autoComplete="postal-code"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="00000-000"
              type="text"
              {...postalCodeFieldRegistration}
            />
          </FieldShell>

          <FieldShell error={errors.companyStreetLine1?.message} icon={MapPin} label="Rua ou Avenida">
            <input
              autoComplete="street-address"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="Rua das Palmeiras"
              type="text"
              {...registerField('companyStreetLine1')}
            />
          </FieldShell>

          <FieldShell error={errors.companyStreetNumber?.message} icon={Hash} label="Número">
            <input
              autoComplete="address-line2"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="123"
              type="text"
              {...registerField('companyStreetNumber')}
            />
          </FieldShell>
        </div>

        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          <FieldShell error={errors.companyDistrict?.message} icon={MapPin} label="Bairro / Região">
            <input
              autoComplete="address-level3"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="Centro"
              type="text"
              {...registerField('companyDistrict')}
            />
          </FieldShell>

          <FieldShell error={errors.companyCity?.message} icon={Building2} label="Cidade">
            <input
              autoComplete="address-level2"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="São Paulo"
              type="text"
              {...registerField('companyCity')}
            />
          </FieldShell>

          <FieldShell error={errors.companyState?.message} icon={MapPin} label="Estado">
            <input
              autoComplete="address-level1"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="SP"
              type="text"
              {...registerField('companyState')}
            />
          </FieldShell>

          <FieldShell error={errors.companyAddressComplement?.message} icon={Building2} label="Complemento">
            <input
              autoComplete="address-line2"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="Sala, bloco ou referência"
              type="text"
              {...registerField('companyAddressComplement')}
            />
          </FieldShell>
        </div>

        <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <FieldShell error={errors.companyCountry?.message} icon={Globe2} label="País">
            <input
              autoComplete="country-name"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="Brasil"
              type="text"
              {...registerField('companyCountry')}
            />
          </FieldShell>

          <FieldShell error={errors.employeeCount?.message} icon={Users} label="Equipe">
            <div className="flex w-full items-center gap-3">
              <label className="flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/50">
                <input className="size-3.5 accent-white" type="checkbox" {...registerField('hasEmployees')} />
                Possui funcionários
              </label>
              <input
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20 disabled:cursor-not-allowed disabled:text-white/25"
                disabled={!hasEmployees}
                min={0}
                placeholder={hasEmployees ? 'Quantidade' : 'Sem equipe'}
                type="number"
                {...registerField('employeeCount')}
              />
            </div>
          </FieldShell>
        </div>

        <div className="grid gap-2.5 md:grid-cols-2">
          <FieldShell error={errors.password?.message} hint={passwordHint} icon={LockKeyhole} label="Senha de Acesso">
            <input
              autoComplete="new-password"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="Crie uma senha forte"
              type={showPassword ? 'text' : 'password'}
              {...registerField('password')}
            />
            <button
              className="shrink-0 text-white/30 transition-colors hover:text-white/60"
              type="button"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </FieldShell>

          <FieldShell error={confirmPasswordError} icon={LockKeyhole} label="Confirmar Senha">
            <input
              autoComplete="new-password"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              placeholder="Repita sua senha"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button
              className="shrink-0 text-white/30 transition-colors hover:text-white/60"
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </FieldShell>
        </div>

        <div className="space-y-2 pt-0.5">
          <p className="text-[11px] leading-4 text-white/34">
            Ao continuar, você aceita os termos obrigatórios e reconhece que o endereço exato ficará restrito aos fluxos
            autorizados da plataforma.
          </p>

          <div className="grid gap-2 md:grid-cols-2">
            {documents.map((doc) => {
              if (doc.key === 'terms-of-use') {
                return (
                  <label
                    key={doc.key}
                    className="flex items-start gap-2 rounded-md px-0.5 py-0.5 text-[12px] text-white/72"
                  >
                    <input
                      className="mt-0.5 size-3.5 shrink-0 accent-white"
                      type="checkbox"
                      {...registerField('acceptTerms')}
                    />
                    <span className="leading-4">
                      Aceito os <span className="font-medium text-white">{doc.title.toLowerCase()}</span>.
                    </span>
                  </label>
                )
              }

              if (doc.key === 'privacy-policy') {
                return (
                  <label
                    key={doc.key}
                    className="flex items-start gap-2 rounded-md px-0.5 py-0.5 text-[12px] text-white/72"
                  >
                    <input
                      className="mt-0.5 size-3.5 shrink-0 accent-white"
                      type="checkbox"
                      {...registerField('acceptPrivacy')}
                    />
                    <span className="leading-4">
                      Li e aceito o <span className="font-medium text-white">{doc.title.toLowerCase()}</span>.
                    </span>
                  </label>
                )
              }

              return null
            })}
          </div>

          {(errors.acceptTerms?.message || errors.acceptPrivacy?.message) && (
            <p className="text-[11px] text-red-400">{errors.acceptTerms?.message ?? errors.acceptPrivacy?.message}</p>
          )}
        </div>

        {submitError && <p className="text-[11px] text-red-400">{submitError}</p>}

        <button
          className="w-full rounded-lg bg-gradient-to-b from-white to-white/80 px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? 'Criando conta...' : 'Criar conta e validar empresa'}
        </button>

        <div className="flex items-center justify-center gap-2 text-[12px] text-white/38">
          <span>Já possui uma conta?</span>
          <button
            className="inline-flex items-center gap-1 font-medium text-white/72 transition-colors hover:text-white"
            type="button"
            onClick={() => router.push('/login')}
          >
            Ir para o Portal
            <ArrowLeft className="size-3.5" />
          </button>
        </div>
      </form>
    </div>
  )
}

function FieldShell({
  children,
  error,
  hint,
  icon: Icon,
  label,
}: Readonly<{
  children: ReactNode
  error?: string | null
  hint?: string | null
  icon: LucideIcon
  label: string
}>) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-white/50">{label}</label>
      <div
        className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 transition-colors duration-200 ${
          error ? 'border-red-400/30 bg-red-500/[0.04]' : 'border-white/10 bg-white/[0.03] focus-within:border-white/25'
        }`}
      >
        <Icon className="size-4 shrink-0 text-white/30" />
        {children}
      </div>
      {error ? <p className="text-[10px] leading-4 text-red-400">{error}</p> : null}
      {!error && hint ? <p className="text-[10px] leading-4 text-white/30">{hint}</p> : null}
    </div>
  )
}

function normalizePostalCode(value: string | undefined) {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 8)
  return /^\d{8}$/.test(digits) ? digits : null
}

function formatPostalCodeValue(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)

  if (digits.length <= 5) {
    return digits
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}
