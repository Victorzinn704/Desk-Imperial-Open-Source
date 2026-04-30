'use client'

import { type OwnerAccountViewProps } from './owner-account-view-model'
import { OwnerAccountGroups, OwnerAccountProfile } from './owner-account-view-sections'
import { ThermalPrintSettingsCard } from '@/components/shared/thermal-print-settings-card'

export function OwnerAccountView({
  companyName,
  displayName,
  onOpenDashboard,
  onOpenQuickRegister,
  onOpenSecurity,
  onOpenSettings,
}: OwnerAccountViewProps) {
  return (
    <div className="space-y-4 p-3 pb-[8.5rem]">
      <OwnerAccountProfile companyName={companyName} displayName={displayName} />
      <ThermalPrintSettingsCard />
      <OwnerAccountGroups
        onOpenDashboard={onOpenDashboard}
        onOpenQuickRegister={onOpenQuickRegister}
        onOpenSecurity={onOpenSecurity}
        onOpenSettings={onOpenSettings}
      />
    </div>
  )
}
