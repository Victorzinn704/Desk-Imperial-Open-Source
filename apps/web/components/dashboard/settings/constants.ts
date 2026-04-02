export const SETTINGS_PREFS_KEY = 'desk_imperial_workspace_preferences'

export const periodOptions = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
]

export type WorkspacePreferences = {
  defaultPeriod: string
  executiveModules: {
    revenue: boolean
    operations: boolean
    map: boolean
    team: boolean
  }
}

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  defaultPeriod: '30',
  executiveModules: {
    revenue: true,
    operations: true,
    map: true,
    team: true,
  },
}
