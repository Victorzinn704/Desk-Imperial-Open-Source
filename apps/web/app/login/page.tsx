import { AuthShell } from '@/components/auth/auth-shell'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <AuthShell
      description="Entramos agora na fase em que a fundacao arquitetural vira experiencia real. O objetivo aqui e garantir um acesso confiavel, claro e alinhado com as regras de seguranca do projeto."
      eyebrow="Autenticacao segura"
      title="Login com base pronta para LGPD, logs e operacao do cliente."
    >
      <LoginForm />
    </AuthShell>
  )
}
