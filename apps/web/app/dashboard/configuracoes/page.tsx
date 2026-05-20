import { redirect } from 'next/navigation'

export default function LegacySettingsPage() {
  redirect('/design-lab/config?tab=account')
}
