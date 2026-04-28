// Constants & helpers
export {
  STATUS_CONFIG,
  GARCOM_CORES,
  garcomCor,
  initials,
  urgencyLevel,
  urgencyBorderColor,
  urgencyShadow,
  resolveMesaComanda,
  type SalaoView,
  type FilterStatus,
} from './constants'
export { buildSalaoStats, matchesMesaFilter } from './helpers'

// Hooks
export { useUrgencyTick } from './hooks/use-urgency-tick'

// Components
export { GarcomAvatar, type GarcomAvatarProps } from './components/garcom-avatar'
export { GarcomSelector, type GarcomSelectorProps } from './components/garcom-selector'
export { ItemsTooltip, type ItemsTooltipProps } from './components/items-tooltip'
export { FilterChip, type FilterChipProps } from './components/filter-chip'
export { ViewBtn, type ViewBtnProps } from './components/view-btn'
export { MesaCard, type MesaCardProps } from './components/mesa-card'
export { MesaCompact, type MesaCompactProps } from './components/mesa-compact'
export { GarcomStrip } from './components/garcom-strip'
export { SalaoToolbar } from './components/salao-toolbar'
export { SalaoContent } from './components/salao-content'
export { SalaoInstructions } from './components/salao-instructions'
export { SalaoBoardView } from './components/salao-view'
export { EquipeView } from './components/equipe-view'
