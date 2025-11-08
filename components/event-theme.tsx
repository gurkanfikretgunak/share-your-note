'use client'

import { EventMode } from '@/types/database.types'
import { ReactNode } from 'react'

interface EventThemeProps {
  mode: EventMode
  children: ReactNode
}

export function EventTheme({ mode, children }: EventThemeProps) {
  const themeClasses = {
    general: 'bg-white',
    birthday: 'bg-gradient-to-br from-pink-50 to-yellow-50',
    party: 'bg-gradient-to-br from-purple-50 to-blue-50',
  }

  return (
    <div className={`min-h-screen ${themeClasses[mode]}`}>
      {children}
    </div>
  )
}

