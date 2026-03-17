import { AuthShell } from '@/components/auth/auth-shell'
import { RegisterForm } from '@/components/auth/register-form'

export default function RegisterPage() {
  return (
    <AuthShell
      description="Crie sua conta em 1 minuto. Seu comércio agradece."
      eyebrow="Comece agora"
      title="Prepare seu controle"
    >
      <RegisterForm />
    </AuthShell>
  )
}
