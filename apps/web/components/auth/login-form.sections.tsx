import Link from 'next/link'
import type { Dispatch, SetStateAction } from 'react'
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form'
import { Building2, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import type { LoginFormValues } from '@/lib/validation'
import type { LoginMode } from './login-form.controller'

type FieldInputProps = UseFormRegisterReturn
type FieldErrorsMap = FieldErrors<LoginFormValues>
type RegisterLoginField = (
  name: 'companyEmail' | 'employeeCode' | 'email' | 'loginMode' | 'password',
) => FieldInputProps

const LOGIN_COPY: Record<LoginMode, { title: string; description: string }> = {
  OWNER: {
    title: 'Entre e comande seu comércio',
    description: 'Inicie sua sessão corporativa preenchendo as credenciais vitais abaixo.',
  },
  STAFF: {
    title: 'Entre na operação do dia',
    description: 'Use o e-mail da empresa, seu ID de acesso e a senha numérica de 8 dígitos emitida pelo dono.',
  },
}

const LOGIN_MODE_OPTIONS = [
  { icon: Building2, label: 'Empresa', mode: 'OWNER' },
  { icon: UserRound, label: 'Funcionário', mode: 'STAFF' },
] as const

const ACTIVE_MODE_BUTTON_CLASS = 'bg-white text-black'
const INACTIVE_MODE_BUTTON_CLASS = 'text-[var(--text-primary)]/55 hover:text-[var(--text-primary)]'
const MODE_BUTTON_BASE_CLASS =
  'flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors'

const OWNER_PASSWORD_INPUT_PROPS = {
  autoComplete: 'current-password',
  className:
    'w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-primary)]/20',
  placeholder: '••••••••',
}

const STAFF_PASSWORD_INPUT_PROPS = {
  autoComplete: 'current-password',
  className:
    'w-full bg-transparent text-sm tracking-[0.3em] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-primary)]/20',
  inputMode: 'numeric',
  maxLength: 8,
  placeholder: '••••••••',
}

function getModeButtonClass(isActive: boolean) {
  return `${MODE_BUTTON_BASE_CLASS} ${isActive ? ACTIVE_MODE_BUTTON_CLASS : INACTIVE_MODE_BUTTON_CLASS}`
}

export function LoginHeader({ loginMode }: { loginMode: LoginMode }) {
  const copy = LOGIN_COPY[loginMode]

  return (
    <div className="space-y-1.5">
      <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{copy.title}</h2>
      <p className="text-sm text-[var(--text-primary)]/40">{copy.description}</p>
    </div>
  )
}

export function LoginModeSwitcher({
  loginMode,
  setLoginMode,
}: {
  loginMode: LoginMode
  setLoginMode: (mode: LoginMode) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
      {LOGIN_MODE_OPTIONS.map((option) => {
        const Icon = option.icon
        const isActive = loginMode === option.mode

        return (
          <button
            className={getModeButtonClass(isActive)}
            key={option.mode}
            type="button"
            onClick={() => setLoginMode(option.mode)}
          >
            <Icon className="size-4" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function StaffIdentityFields({
  registerField,
  errors,
}: {
  registerField: RegisterLoginField
  errors: FieldErrorsMap
}) {
  return (
    <>
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--text-primary)]/50" htmlFor="login-company-email">
          Email da Empresa
        </label>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
          <Mail className="size-4 shrink-0 text-[var(--text-primary)]/30" />
          <input
            autoComplete="email"
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-primary)]/20"
            id="login-company-email"
            placeholder="ceo@empresa.com"
            type="email"
            {...registerField('companyEmail')}
          />
        </div>
        {errors.companyEmail?.message ? <p className="text-xs text-red-400">{errors.companyEmail.message}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--text-primary)]/50" htmlFor="login-employee-code">
          ID de acesso
        </label>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
          <UserRound className="size-4 shrink-0 text-[var(--text-primary)]/30" />
          <input
            autoCapitalize="characters"
            autoComplete="username"
            className="w-full bg-transparent text-sm uppercase tracking-[0.16em] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-primary)]/20"
            id="login-employee-code"
            placeholder="A7K2M9"
            type="text"
            {...registerField('employeeCode')}
          />
        </div>
        {errors.employeeCode?.message ? <p className="text-xs text-red-400">{errors.employeeCode.message}</p> : null}
      </div>
    </>
  )
}

export function OwnerIdentityField({
  registerField,
  errors,
}: {
  registerField: RegisterLoginField
  errors: FieldErrorsMap
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-[var(--text-primary)]/50" htmlFor="login-email">
        Email Corporativo
      </label>
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
        <Mail className="size-4 shrink-0 text-[var(--text-primary)]/30" />
        <input
          autoComplete="email"
          className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-primary)]/20"
          id="login-email"
          placeholder="ceo@empresa.com"
          type="email"
          {...registerField('email')}
        />
      </div>
      {errors.email?.message ? <p className="text-xs text-red-400">{errors.email.message}</p> : null}
    </div>
  )
}

export function PasswordField({
  errors,
  isStaffMode,
  registerField,
  setShowPassword,
  showPassword,
}: {
  errors: FieldErrorsMap
  isStaffMode: boolean
  registerField: RegisterLoginField
  setShowPassword: Dispatch<SetStateAction<boolean>>
  showPassword: boolean
}) {
  const passwordInputProps = isStaffMode ? STAFF_PASSWORD_INPUT_PROPS : OWNER_PASSWORD_INPUT_PROPS

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[var(--text-primary)]/50" htmlFor="login-password">
          Senha de acesso
        </label>
        {isStaffMode ? null : (
          <Link
            className="text-xs text-[var(--text-primary)]/40 hover:text-[var(--text-primary)]/70 transition-colors"
            href="/recuperar-senha"
          >
            Esqueci a senha
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 focus-within:border-white/25 transition-colors duration-200">
        <LockKeyhole className="size-4 shrink-0 text-[var(--text-primary)]/30" />
        <input
          id="login-password"
          type={showPassword ? 'text' : 'password'}
          {...passwordInputProps}
          {...registerField('password')}
        />
        <button
          className="shrink-0 text-[var(--text-primary)]/30 hover:text-[var(--text-primary)]/60 transition-colors"
          type="button"
          onClick={() => setShowPassword((value) => !value)}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {errors.password?.message ? <p className="text-xs text-red-400">{errors.password.message}</p> : null}
    </div>
  )
}

export function LoginSubmitActions({
  isLoading,
  isStaffMode,
  onDemoLogin,
}: {
  isLoading: boolean
  isStaffMode: boolean
  onDemoLogin: () => void
}) {
  return (
    <>
      <button
        className="w-full rounded-lg bg-gradient-to-b from-white to-white/80 px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? 'Entrando...' : 'Entrar no portal'}
      </button>

      <button
        className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4 text-left transition-colors duration-200 hover:border-white/20 disabled:opacity-50"
        disabled={isLoading}
        type="button"
        onClick={onDemoLogin}
      >
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Acessar Sessão Demo {isStaffMode ? 'Funcionário' : 'Empresa'}
          </p>
          <p className="text-xs text-[var(--text-primary)]/40">Experimente sem compromisso</p>
        </div>
        <svg
          aria-hidden="true"
          className="size-4 text-[var(--text-primary)]/30"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  )
}

export function LoginFooter() {
  return (
    <>
      <p className="text-center text-sm text-[var(--text-primary)]/40">
        Não possui uma conta?{' '}
        <Link
          className="font-semibold text-[var(--text-primary)] underline underline-offset-4 hover:text-[var(--text-primary)]/70 transition-colors"
          href="/cadastro"
        >
          Solicitar acesso
        </Link>
      </p>

      <p className="text-center text-xs leading-5 text-[var(--text-primary)]/20">
        Ao acessar, você atesta compromisso com os guias de uso restrito interno de Governança e Operação.
      </p>
    </>
  )
}
