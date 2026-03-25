import { AuthShell } from '@/components/auth/auth-shell'
import { RegisterForm } from '@/components/auth/register-form'

export default function RegisterPage() {
  return (
    <AuthShell
      contentWidthClass="max-w-[900px]"
      description="Cadastre a empresa com endereço validado, estrutura inicial da equipe e acesso seguro ao portal."
      eyebrow="Seu acesso seguro"
      title="Crie e ative seu acesso"
    >
      <RegisterForm />
    </AuthShell>
  )
}
