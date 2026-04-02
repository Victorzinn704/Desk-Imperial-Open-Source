'use client'

import { useState } from 'react'

export function useActivityTimeline() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleTimeline = () => setIsOpen(!isOpen)

  return {
    isOpen,
    toggleTimeline,
    closeTimeline: () => setIsOpen(false),
  }
}
