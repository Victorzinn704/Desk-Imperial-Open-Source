import { AuthShell } from '@/components/auth/auth-shell'
import { VerifyEmailForm } from '@/components/auth/verify-email-form'

export default async function VerifyEmailPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    email?: string
  }>
}>) {
  const { email } = await searchParams

  return (
    <AuthShell
      description="Quase lá. Confirme seu email e comece a operar."
      eyebrow="Confirmação"
      title="Valide seu acesso"
    >
      <VerifyEmailForm email={email} />
    </AuthShell>
  )
}
