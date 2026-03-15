import { AuthShell } from '@/components/auth/auth-shell'
import { RegisterForm } from '@/components/auth/register-form'

export default function RegisterPage() {
  return (
    <AuthShell
      description="O cadastro ja foi pensado para nao ser apenas uma tela bonita. Ele prepara aceite de documentos, preferencia de cookies e uma entrada segura no ecossistema do portal."
      eyebrow="Onboarding seguro"
      title="Cadastro institucional com consentimento e sessao protegida."
    >
      <RegisterForm />
    </AuthShell>
  )
}
