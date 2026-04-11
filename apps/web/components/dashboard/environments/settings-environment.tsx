'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Cog } from 'lucide-react'
import { ApiError } from '@/lib/api'
import type { ProfileFormValues } from '@/lib/validation'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import type { DashboardSectionId, DashboardSettingsSectionId } from '@/components/dashboard/dashboard-navigation'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { DashboardSettingsPanel } from '@/components/dashboard/dashboard-settings-panel'

type SettingsEnvironmentProps = {
  activeSettingsSection: DashboardSettingsSectionId
  onNavigateSection: (sectionId: DashboardSectionId) => void
  onSettingsSectionChange: (sectionId: DashboardSettingsSectionId) => void
}

export function SettingsEnvironment({
  activeSettingsSection,
  onNavigateSection,
  onSettingsSectionChange,
}: Readonly<SettingsEnvironmentProps>) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const { sessionQuery, consentQuery } = useDashboardQueries({ section: 'settings' })
  const { logoutMutation: _logoutMutation, preferenceMutation, updateProfileMutation } = useDashboardMutations()

  const user = sessionQuery.data?.user

  if (!user) {return null}

  const cookiePreferences = consentQuery.data?.cookiePreferences ?? user.cookiePreferences
  const legalAcceptances = consentQuery.data?.legalAcceptances ?? []
  const documentTitles = new Map(consentQuery.data?.documents.map((doc) => [doc.key, doc.title]) ?? [])
  const profileMutationError = updateProfileMutation.error instanceof ApiError ? updateProfileMutation.error : undefined

  const handleLogout = () => {
    _logoutMutation.mutate(undefined, {
      onSuccess: () => startTransition(() => router.push('/login')),
    })
  }

  const handleProfileSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values)
  }

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Conta, segurança, preferências locais e conformidade agora vivem em um único ambiente administrativo."
        eyebrow="Conta e governança"
        icon={Cog}
        title="Configurações do workspace"
      />

      <DashboardSettingsPanel
        activeTab={activeSettingsSection}
        consentQueryIsLoading={consentQuery.isLoading}
        cookiePreferences={cookiePreferences}
        documentTitles={documentTitles}
        legalAcceptances={legalAcceptances}
        logoutBusy={_logoutMutation.isPending}
        preferenceMutation={preferenceMutation}
        profileError={profileMutationError?.message}
        profileLoading={updateProfileMutation.isPending}
        user={user}
        onLogout={handleLogout}
        onNavigateSection={onNavigateSection}
        onProfileSubmit={handleProfileSubmit}
        onTabChange={onSettingsSectionChange}
      />
    </section>
  )
}
