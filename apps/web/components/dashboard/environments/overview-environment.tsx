'use client'

import type { ComponentType } from 'react'
import type { OverviewVariant, OverviewViewProps } from './overview-environment.model'
import { useOverviewEnvironmentState } from './overview-environment.controller'
import { OverviewLockedState } from './overview-environment.shared'
import { OverviewPrincipalView } from './overview-principal-view'
import { OverviewLayoutView } from './overview-layout-view'
import { OverviewMetaView } from './overview-meta-view'
import { OverviewOperationalView } from './overview-operational-view'
import { OverviewEditorialView } from './overview-editorial-view'

export { DesignLabOverviewEnvironment } from './overview-design-lab-environment'

const overviewViews = {
  editorial: OverviewEditorialView,
  layout: OverviewLayoutView,
  meta: OverviewMetaView,
  operacional: OverviewOperationalView,
  principal: OverviewPrincipalView,
} satisfies Record<OverviewVariant, ComponentType<Readonly<OverviewViewProps>>>

export function OverviewEnvironment({ variant = 'principal' }: Readonly<{ variant?: OverviewVariant }>) {
  const state = useOverviewEnvironmentState()

  if (state.kind === 'locked') {
    return <OverviewLockedState />
  }

  const View = overviewViews[variant] ?? OverviewPrincipalView
  return <View {...state.props} />
}
