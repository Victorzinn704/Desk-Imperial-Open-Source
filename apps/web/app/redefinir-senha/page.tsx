import { AuthShell } from '@/components/auth/auth-shell'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default async function ResetPasswordPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    email?: string
  }>
}>) {
  const { email } = await searchParams

  return (
    <AuthShell
      description="Crie uma nova senha forte e recomeçar a controlar."
      eyebrow="Nova senha"
      title="Redefina seu acesso"
    >
      <ResetPasswordForm email={email} />
    </AuthShell>
  )
}
