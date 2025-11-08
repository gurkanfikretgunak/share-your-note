'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EventFeed } from '@/components/event-feed'
import { HostAnnouncement } from '@/components/host-announcement'
import { ImageUpload } from '@/components/image-upload'
import { EventTheme } from '@/components/event-theme'
import { createClient } from '@/lib/supabase'
import { getOrCreateAnonymousUser, getStoredAnonymousUser } from '@/lib/anonymous-auth'
import { NoteWithParticipant, Event, Participant } from '@/types/database.types'
import { Smile, Heart, ThumbsUp, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'

const EMOTIONS = [
  { emoji: '😊', label: 'Happy', icon: Smile },
  { emoji: '❤️', label: 'Love', icon: Heart },
  { emoji: '👍', label: 'Like', icon: ThumbsUp },
  { emoji: '🎉', label: 'Celebrate', icon: PartyPopper },
]

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const eventCode = params.event_code as string

  const [event, setEvent] = useState<Event | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [notes, setNotes] = useState<NoteWithParticipant[]>([])
  const [textInput, setTextInput] = useState('')
  const [username, setUsername] = useState('')
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && eventCode) {
      loadEvent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCode, mounted])

  useEffect(() => {
    if (event && participant) {
      try {
        const cleanup = subscribeToNotes()
        const cleanupParticipants = subscribeToParticipants()
        return () => {
          try {
            cleanup()
            cleanupParticipants()
          } catch (err) {
            console.error('Error cleaning up subscriptions:', err)
          }
        }
      } catch (err) {
        console.error('Error setting up subscriptions:', err)
        setIsLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, participant])

  const loadEvent = async () => {
    if (!mounted) return
    
    try {
      setIsLoading(true)
      setError(null)
      const supabase = createClient()
      // Check if event exists
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('event_code', eventCode.toUpperCase())
        .single()

      if (eventError || !eventData) {
        setError('Event not found')
        setIsLoading(false)
        return
      }

      if (eventData.status === 'finished') {
        setError('This event has ended')
        setIsLoading(false)
        return
      }

      setEvent(eventData)

      // Check for stored anonymous user
      const storedUser = getStoredAnonymousUser()
      console.log('loadEvent: Stored user:', storedUser ? 'found' : 'not found')
      if (storedUser) {
        try {
          console.log('loadEvent: Attempting to join event with stored user...')
          await joinEvent(storedUser.id, supabase)
          console.log('loadEvent: Successfully joined event')
        } catch (err) {
          console.error('loadEvent: Error joining event:', err)
          // If join fails, show username prompt
          setShowUsernamePrompt(true)
          setIsLoading(false)
        }
      } else {
        console.log('loadEvent: No stored user, showing username prompt')
        setShowUsernamePrompt(true)
        setIsLoading(false)
      }
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to load event')
      setIsLoading(false)
    }
  }

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !event) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const user = await getOrCreateAnonymousUser(username.trim())
      await joinEvent(user.id, supabase)
      // Only hide prompt after successful join
      setShowUsernamePrompt(false)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to join event')
      setIsLoading(false)
      // Keep username prompt open on error
    }
  }

  const joinEvent = async (profileId: string, supabaseClient = createClient()) => {
    if (!event) {
      console.error('joinEvent: event is null')
      setIsLoading(false)
      return
    }
    
    try {
      console.log('joinEvent: Checking for existing participant...')
      // Check if already a participant
      const { data: existingParticipant, error: checkError } = await supabaseClient
        .from('participants')
        .select('*')
        .eq('event_id', event.id)
        .eq('profile_id', profileId)
        .maybeSingle()

      if (checkError) {
        console.error('joinEvent: Error checking participant:', checkError)
        throw checkError
      }

      if (existingParticipant) {
        console.log('joinEvent: Existing participant found')
        setParticipant(existingParticipant)
        setIsLoading(false)
        return
      }

      console.log('joinEvent: Creating new participant...')
      // Join as participant
      const { data: newParticipant, error: joinError } = await supabaseClient
        .from('participants')
        .insert({
          event_id: event.id,
          profile_id: profileId,
          role: 'attendee',
        })
        .select()
        .single()

      if (joinError) {
        console.error('joinEvent: Error joining event:', joinError)
        throw joinError
      }

      console.log('joinEvent: Successfully joined event')
      setParticipant(newParticipant)
      setIsLoading(false)
    } catch (err) {
      const error = err as Error
      console.error('joinEvent: Exception:', error)
      setError(error.message || 'Failed to join event')
      setIsLoading(false)
      throw err // Re-throw to handle in handleUsernameSubmit
    }
  }

  const subscribeToNotes = () => {
    if (!event) return () => {}

    const supabase = createClient()
    const channel = supabase
      .channel(`notes:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notes',
          filter: `event_id=eq.${event.id}`,
        },
        async (payload: { new: { id: string } }) => {
          try {
            // Fetch the new note with participant and profile data
            const { data: newNote, error: fetchError } = await supabase
              .from('notes')
              .select(`
                *,
                participant:participants!inner(
                  *,
                  profile:profiles!inner(*)
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (fetchError) {
              console.error('Error fetching new note:', fetchError)
              return
            }

            if (newNote) {
              setNotes((prev) => [newNote as NoteWithParticipant, ...prev])
            }
          } catch (err) {
            console.error('Error processing new note:', err)
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to notes channel')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error')
        }
      })

    // Load existing notes
    loadNotes(supabase)

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const subscribeToParticipants = () => {
    if (!event || !participant) return () => {}

    const supabase = createClient()
    const channel = supabase
      .channel(`participants:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participants',
          filter: `event_id=eq.${event.id}`,
        },
        async (payload: { new: { id: string; profile_id: string } }) => {
          // Don't show toast for current user joining
          if (payload.new.profile_id === participant.profile_id) {
            return
          }

          try {
            // Fetch the new participant with profile data
            const { data: newParticipant } = await supabase
              .from('participants')
              .select(`
                *,
                profile:profiles!inner(*)
              `)
              .eq('id', payload.new.id)
              .single()

            if (newParticipant && newParticipant.profile) {
              toast.success(`${newParticipant.profile.username} joined the event!`, {
                duration: 3000,
              })
            }
          } catch (err) {
            console.error('Error fetching new participant:', err)
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to participants channel')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Participants channel error')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const loadNotes = async (supabaseClient = createClient()) => {
    if (!event) return

    try {
      const { data: notesData, error: notesError } = await supabaseClient
        .from('notes')
        .select(`
          *,
          participant:participants!inner(
            *,
            profile:profiles!inner(*)
          )
        `)
        .eq('event_id', event.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (notesError) {
        console.error('Error loading notes:', notesError)
        setError('Failed to load notes: ' + notesError.message)
        return
      }

      if (notesData) {
        setNotes(notesData as NoteWithParticipant[])
      }
    } catch (err) {
      const error = err as Error
      console.error('Error loading notes:', error)
      setError('Failed to load notes: ' + error.message)
    }
  }

  const handleSubmitText = async () => {
    if (!textInput.trim() || !participant || !event) return

    setIsSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: noteError } = await supabase.from('notes').insert({
        event_id: event.id,
        participant_id: participant.id,
        content_type: 'text',
        content_data: textInput.trim(),
      })

      if (noteError) {
        throw noteError
      }

      setTextInput('')
      // Reload notes to ensure the new note appears
      setTimeout(() => {
        loadNotes(supabase)
      }, 500)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to submit note')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitEmotion = async (emoji: string) => {
    if (!participant || !event) return

    setIsSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: noteError } = await supabase.from('notes').insert({
        event_id: event.id,
        participant_id: participant.id,
        content_type: 'emotion',
        content_data: emoji,
      })

      if (noteError) {
        throw noteError
      }

      // Reload notes to ensure the new note appears
      setTimeout(() => {
        loadNotes(supabase)
      }, 500)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to submit emotion')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = async (imageUrl: string) => {
    if (!participant || !event) return

    setIsSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: noteError } = await supabase.from('notes').insert({
        event_id: event.id,
        participant_id: participant.id,
        content_type: 'image',
        content_data: imageUrl,
      })

      if (noteError) {
        throw noteError
      }

      // Reload notes to ensure the new note appears
      setTimeout(() => {
        loadNotes(supabase)
      }, 500)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to submit image')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    )
  }

  if (error && !showUsernamePrompt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    )
  }

  if (showUsernamePrompt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-md px-6 space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Join Event</h2>
            <p className="text-muted-foreground">Enter your name to join</p>
          </div>
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}
            <Input
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError(null)
              }}
              autoFocus
              disabled={isLoading}
            />
            <Button type="submit" className="w-full" disabled={!username.trim() || isLoading || !event}>
              {isLoading ? 'Joining...' : 'Join'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  if (!event || !participant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <EventTheme mode={event.event_mode}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 pb-32">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-semibold">{event.title}</h1>
                <Badge variant="secondary" className="text-sm">
                  {notes.length} {notes.length === 1 ? 'message' : 'messages'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Event Code: {event.event_code}</p>
            </div>

            <HostAnnouncement eventCode={event.event_code} />

            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            <EventFeed notes={notes} />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Share your thoughts..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitText()
                  }
                }}
                disabled={isSubmitting}
                className="flex-1"
              />
              <Button
                onClick={handleSubmitText}
                disabled={!textInput.trim() || isSubmitting}
              >
                Send
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <ImageUpload
                eventId={event.id}
                participantId={participant.id}
                onUploadComplete={handleImageUpload}
                onError={setError}
              />

              <div className="flex gap-2 ml-auto">
                {EMOTIONS.map((emotion) => (
                  <Button
                    key={emotion.emoji}
                    variant="outline"
                    size="icon"
                    onClick={() => handleSubmitEmotion(emotion.emoji)}
                    disabled={isSubmitting}
                    title={emotion.label}
                  >
                    <span className="text-xl">{emotion.emoji}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </EventTheme>
  )
}

