'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { QRScanner } from '@/components/qr-scanner'
import { LanguageSwitcher } from '@/components/language-switcher'
import { QrCode, Cake, PartyPopper, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Confetti from 'react-confetti'
import { EventMode } from '@/types/database.types'

export default function Home() {
  const [eventCode, setEventCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [selectedMode, setSelectedMode] = useState<EventMode>('general')
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('home')
  const tCommon = useTranslations('common')
  const supabase = createClient()

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (selectedMode === 'birthday' || selectedMode === 'party') {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 5000)
      return () => clearTimeout(timer)
    } else {
      setShowConfetti(false)
    }
  }, [selectedMode])

  const handleJoin = async () => {
    if (!eventCode.trim()) {
      setError(t('errors.enterCode'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const code = eventCode.trim().toUpperCase()
      
      // Check if event exists
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, status, event_code')
        .eq('event_code', code)
        .single()

      if (eventError || !event) {
        setError(t('errors.invalidCode'))
        setIsLoading(false)
        return
      }

      if (event.status === 'finished') {
        setError(t('errors.eventEnded'))
        setIsLoading(false)
        return
      }

      if (event.status === 'pending') {
        setError(t('errors.eventPending'))
        setIsLoading(false)
        return
      }

      // Redirect to event page with locale
      router.push(`/${locale}/event/${code}`)
    } catch {
      setError(t('errors.somethingWrong'))
      setIsLoading(false)
    }
  }

  const handleQRScan = async (code: string) => {
    setQrScannerOpen(false)
    const eventCodeValue = code.trim().toUpperCase()
    setEventCode(eventCodeValue)
    
    // Automatically join after scanning QR code
    if (eventCodeValue) {
      setIsLoading(true)
      setError(null)

      try {
        // Check if event exists
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('id, status, event_code')
          .eq('event_code', eventCodeValue)
          .single()

        if (eventError || !event) {
          setError(t('errors.invalidCode'))
          setIsLoading(false)
          return
        }

        if (event.status === 'finished') {
          setError(t('errors.eventEnded'))
          setIsLoading(false)
          return
        }

        if (event.status === 'pending') {
          setError(t('errors.eventPending'))
          setIsLoading(false)
          return
        }

        // Redirect to event page with locale
        router.push(`/${locale}/event/${eventCodeValue}`)
      } catch {
        setError(t('errors.somethingWrong'))
        setIsLoading(false)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJoin()
    }
  }

  const getBackgroundClass = () => {
    switch (selectedMode) {
      case 'birthday':
        return 'bg-gradient-to-br from-pink-50 via-yellow-50 to-pink-100'
      case 'party':
        return 'bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50'
      default:
        return 'bg-white'
    }
  }

  return (
    <div className={`flex min-h-screen flex-col ${getBackgroundClass()} relative overflow-hidden`}>
      {/* Confetti Effect */}
      {showConfetti && (selectedMode === 'birthday' || selectedMode === 'party') && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={selectedMode === 'birthday' ? 200 : 300}
          colors={selectedMode === 'birthday' 
            ? ['#FF6B9D', '#FFC107', '#FF9800', '#E91E63', '#F06292']
            : ['#9C27B0', '#673AB7', '#3F51B5', '#E91E63', '#00BCD4', '#FFC107']
          }
        />
      )}

      {/* Floating Balloons for Birthday */}
      {selectedMode === 'birthday' && (
        <>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${(i * 12.5) % 100}%`,
                  top: `${-10 + (i * 15) % 30}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${3 + (i % 3)}s`,
                }}
              >
                <div className="text-4xl">
                  {['🎈', '🎉', '🎊', '🎁'][i % 4]}
                </div>
              </div>
            ))}
          </div>

          {/* Abstract Objects for Birthday */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(15)].map((_, i) => {
              const shapes = ['circle', 'triangle', 'square', 'star']
              const shape = shapes[i % 4]
              const colors = ['#FF6B9D', '#FFC107', '#FF9800', '#E91E63', '#F06292']
              const color = colors[i % 5]
              const size = 20 + (i % 5) * 10
              const left = (i * 6.67) % 100
              const top = (i * 6.67) % 100
              const rotation = (i * 24) % 360
              const delay = i * 0.2

              return (
                <div
                  key={`abstract-${i}`}
                  className="absolute animate-float"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    animationDelay: `${delay}s`,
                    animationDuration: `${4 + (i % 3)}s`,
                    transform: `rotate(${rotation}deg)`,
                  }}
                >
                  {shape === 'circle' && (
                    <div
                      className="rounded-full opacity-60"
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        background: `radial-gradient(circle, ${color}, ${color}88)`,
                        boxShadow: `0 0 ${size}px ${color}40`,
                      }}
                    />
                  )}
                  {shape === 'triangle' && (
                    <div
                      className="opacity-60"
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: `${size / 2}px solid transparent`,
                        borderRight: `${size / 2}px solid transparent`,
                        borderBottom: `${size}px solid ${color}`,
                        filter: `drop-shadow(0 0 ${size / 2}px ${color}40)`,
                      }}
                    />
                  )}
                  {shape === 'square' && (
                    <div
                      className="opacity-60"
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        background: `linear-gradient(135deg, ${color}, ${color}88)`,
                        boxShadow: `0 0 ${size}px ${color}40`,
                        transform: `rotate(45deg)`,
                      }}
                    />
                  )}
                  {shape === 'star' && (
                    <svg
                      width={size}
                      height={size}
                      viewBox="0 0 24 24"
                      fill={color}
                      opacity="0.6"
                      style={{
                        filter: `drop-shadow(0 0 ${size / 2}px ${color}40)`,
                      }}
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Party Mode Effects */}
      {selectedMode === 'party' && (
        <>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
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

          {/* Laser Show for Party */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
          </div>
        </>
      )}

      <main className="flex-1 flex items-center justify-center w-full px-6 py-12 relative z-10">
        <div className="w-full max-w-md flex flex-col items-center gap-8">
          {/* Language Switcher */}
          <div className="absolute top-4 right-4 z-20">
            <LanguageSwitcher />
          </div>

          {/* Mode Toggle Buttons */}
          <div className="flex gap-2 p-1 bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm">
            <Button
              variant={selectedMode === 'general' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedMode('general')}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {t('modes.general')}
            </Button>
            <Button
              variant={selectedMode === 'birthday' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedMode('birthday')}
              className="gap-2"
            >
              <Cake className="h-4 w-4" />
              {t('modes.birthday')}
            </Button>
            <Button
              variant={selectedMode === 'party' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedMode('party')}
              className="gap-2"
            >
              <PartyPopper className="h-4 w-4" />
              {t('modes.party')}
            </Button>
          </div>

          <div className="text-center">
            <h1 className={`text-4xl font-semibold tracking-tight mb-2 ${
              selectedMode === 'birthday' ? 'text-pink-600' :
              selectedMode === 'party' ? 'text-purple-600' :
              'text-foreground'
            }`}>
              {t('title')}
            </h1>
            <p className="text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>

          {/* Buttons Container */}
          <div className="w-full bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm p-6 space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder={t('eventCodePlaceholder')}
                value={eventCode}
                onChange={(e) => {
                  setEventCode(e.target.value.toUpperCase())
                  setError(null)
                }}
                onKeyPress={handleKeyPress}
                maxLength={6}
                className="text-center text-lg tracking-widest uppercase bg-white"
                disabled={isLoading}
              />
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>

            <Button
              onClick={handleJoin}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? tCommon('joining') : t('joinButton')}
            </Button>

            <Button
              onClick={() => setQrScannerOpen(true)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <QrCode className="mr-2 h-4 w-4" />
              {t('joinWithQR')}
            </Button>
          </div>

          <QRScanner
            open={qrScannerOpen}
            onClose={() => setQrScannerOpen(false)}
            onScan={handleQRScan}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t bg-white/80 backdrop-blur-sm py-4 px-6 relative z-10">
        <div className="max-w-md mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            {t('hostPrompt')}{' '}
            <a
              href={`/${locale}/host/dashboard`}
              className="text-primary hover:underline font-medium"
            >
              {t('goToDashboard')}
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
