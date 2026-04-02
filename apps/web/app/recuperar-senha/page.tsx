import { AuthShell } from '@/components/auth/auth-shell'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      description="Esqueceu a senha? Acontece. Vamos resolver em 30 segundos."
      eyebrow="Recuperar acesso"
      title="Proteja seu comércio"
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
