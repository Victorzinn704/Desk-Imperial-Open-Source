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
      description="O primeiro acesso so e liberado depois da confirmacao do email com codigo de verificacao e expiracao curta."
      eyebrow="Acesso controlado"
      title="Confirme o seu email para liberar o portal."
    >
      <VerifyEmailForm email={email} />
    </AuthShell>
  )
}
