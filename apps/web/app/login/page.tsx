import { AuthShell } from '@/components/auth/auth-shell'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <AuthShell
      description="Entre na sua operação. Seus números estão te esperando. Use demo@deskimperial.online / Demo@123 para conhecer antes de criar conta."
      eyebrow="Seu acesso seguro"
      title="Entre e comande seu comércio"
    >
      <LoginForm />
    </AuthShell>
  )
}
