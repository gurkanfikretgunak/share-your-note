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
    <div className={`min-h-screen relative ${themeClasses[mode]}`}>
      {/* Party Mode Laser Effects */}
      {mode === 'party' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Sweeping Lasers */}
          {[...Array(8)].map((_, i) => {
            const colors = ['#9C27B0', '#673AB7', '#3F51B5', '#E91E63', '#00BCD4', '#FFC107']
            const color = colors[i % 6]
            const angle = i * 45
            const delay = i * 0.5
            const duration = 3 + (i % 2)

            return (
              <div
                key={`laser-${i}`}
                className="absolute"
                style={{
                  top: '50%',
                  left: '50%',
                  width: '200vw',
                  height: '4px',
                  background: `linear-gradient(90deg, transparent 0%, ${color} 15%, ${color} 50%, ${color} 85%, transparent 100%)`,
                  transform: `rotate(${angle}deg) translateX(-50%)`,
                  transformOrigin: 'center center',
                  boxShadow: `0 0 20px ${color}, 0 0 40px ${color}, 0 0 60px ${color}`,
                  animation: `laser-pulse ${duration}s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                  opacity: 0.9,
                }}
              />
            )
          })}

          {/* Rotating Laser Beams */}
          {[...Array(4)].map((_, i) => {
            const colors = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF1493']
            const color = colors[i % 4]
            const delay = i * 0.75

            return (
              <div
                key={`rotating-laser-${i}`}
                className="absolute"
                style={{
                  top: '50%',
                  left: '50%',
                  width: '200vw',
                  height: '5px',
                  background: `linear-gradient(90deg, transparent 0%, ${color} 25%, ${color} 50%, ${color} 75%, transparent 100%)`,
                  transform: 'translateX(-50%)',
                  transformOrigin: 'center center',
                  boxShadow: `0 0 25px ${color}, 0 0 50px ${color}, 0 0 75px ${color}`,
                  animation: `rotate-laser 4s linear infinite`,
                  animationDelay: `${delay}s`,
                  opacity: 1,
                }}
              />
            )
          })}

          {/* Laser Grid */}
          <div className="absolute inset-0 opacity-40">
            {[...Array(5)].map((_, i) => (
              <div
                key={`grid-h-${i}`}
                className="absolute w-full"
                style={{
                  top: `${(i + 1) * 20}%`,
                  height: '2px',
                  background: `linear-gradient(90deg, transparent 0%, #9C27B0 20%, #9C27B0 80%, transparent 100%)`,
                  boxShadow: '0 0 10px #9C27B0, 0 0 20px #9C27B0',
                  animation: `pulse-grid 2s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
            {[...Array(5)].map((_, i) => (
              <div
                key={`grid-v-${i}`}
                className="absolute h-full"
                style={{
                  left: `${(i + 1) * 20}%`,
                  width: '2px',
                  background: `linear-gradient(180deg, transparent 0%, #673AB7 20%, #673AB7 80%, transparent 100%)`,
                  boxShadow: '0 0 10px #673AB7, 0 0 20px #673AB7',
                  animation: `pulse-grid 2s ease-in-out infinite`,
                  animationDelay: `${i * 0.2 + 1}s`,
                }}
              />
            ))}
          </div>

          {/* Sparkling Stars */}
          {[...Array(12)].map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute animate-pulse"
              style={{
                left: `${(i * 8.33) % 100}%`,
                top: `${(i * 8.33) % 100}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + (i % 2)}s`,
              }}
            >
              <div className="text-3xl">
                {['✨', '⭐', '🎆', '🎇', '💫', '🌟'][i % 6]}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

