import { redirect } from 'next/navigation'

export default function LegacySettingsPage() {
  redirect('/dashboard?view=settings&panel=account')
}
