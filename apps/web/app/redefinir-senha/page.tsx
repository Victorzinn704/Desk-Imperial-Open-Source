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
      description="A redefinicao valida o codigo enviado por email, troca a credencial e invalida as sessoes anteriores para manter o acesso seguro."
      eyebrow="Nova credencial"
      title="Defina uma nova senha para continuar no portal."
    >
      <ResetPasswordForm email={email} />
    </AuthShell>
  )
}
