'use client'

import { usePortfolioEnvironmentController } from './portfolio-environment.controller'
import { PortfolioEnvironmentView } from './portfolio-environment.view'

export function PortfolioEnvironment() {
  return <PortfolioEnvironmentView {...usePortfolioEnvironmentController()} />
}
