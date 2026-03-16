import { AuthShell } from '@/components/auth/auth-shell'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      description="Recuperacao de acesso com codigo de verificacao, expiracao curta e protecao contra abuso para manter o fluxo profissional e seguro."
      eyebrow="Senha segura"
      title="Esqueceu sua senha? Vamos enviar um codigo de redefinicao."
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
