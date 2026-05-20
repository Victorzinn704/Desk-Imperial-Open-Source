'use client'

import { useTelegramIntegrationCardController } from './telegram-integration-card.controller'
import { TelegramIntegrationCardView } from './telegram-integration-card.view'

type TelegramIntegrationCardProps = {
  canManageWorkspacePreferences?: boolean
}

export function TelegramIntegrationCard({
  canManageWorkspacePreferences = true,
}: Readonly<TelegramIntegrationCardProps>) {
  const controller = useTelegramIntegrationCardController({ canManageWorkspacePreferences })

  return <TelegramIntegrationCardView controller={controller} />
}
