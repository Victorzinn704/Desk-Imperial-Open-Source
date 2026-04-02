'use client'

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import {
  DEFAULT_WORKSPACE_PREFERENCES,
  SETTINGS_PREFS_KEY,
  type WorkspacePreferences,
} from '@/components/dashboard/settings/constants'

export function useWorkspacePreferences(): [WorkspacePreferences, Dispatch<SetStateAction<WorkspacePreferences>>] {
  const [preferences, setPreferences] = useState<WorkspacePreferences>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_WORKSPACE_PREFERENCES
    }

    const saved = window.localStorage.getItem(SETTINGS_PREFS_KEY)
    if (!saved) {
      return DEFAULT_WORKSPACE_PREFERENCES
    }

    try {
      const parsed = JSON.parse(saved) as Partial<WorkspacePreferences>
      return {
        defaultPeriod: parsed.defaultPeriod ?? DEFAULT_WORKSPACE_PREFERENCES.defaultPeriod,
        executiveModules: {
          ...DEFAULT_WORKSPACE_PREFERENCES.executiveModules,
          ...parsed.executiveModules,
        },
      }
    } catch {
      window.localStorage.removeItem(SETTINGS_PREFS_KEY)
      return DEFAULT_WORKSPACE_PREFERENCES
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(preferences))
  }, [preferences])

  return [preferences, setPreferences]
}
