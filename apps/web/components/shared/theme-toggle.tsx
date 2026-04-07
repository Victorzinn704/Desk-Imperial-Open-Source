'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme()

  // resolvedTheme is undefined during SSR — render placeholder to avoid hydration mismatch
  if (!resolvedTheme) {
    return <div className="h-10 w-10 rounded-full" />
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors duration-200 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      aria-label="Toggle Theme"
    >
      {resolvedTheme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  )
}
