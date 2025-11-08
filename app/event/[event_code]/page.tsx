'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { EventFeed } from '@/components/event-feed'
import { HostAnnouncement } from '@/components/host-announcement'
import { ImageUpload } from '@/components/image-upload'
import { EventTheme } from '@/components/event-theme'
import { createClient } from '@/lib/supabase'
import { getOrCreateAnonymousUser, getStoredAnonymousUser } from '@/lib/anonymous-auth'
import { NoteWithParticipant, Event, Participant, ConsentType } from '@/types/database.types'
import { Smile, Heart, ThumbsUp, PartyPopper, CheckCircle2, Home, X } from 'lucide-react'
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
  const [gdprConsent, setGdprConsent] = useState(false)
  const [policyConsent, setPolicyConsent] = useState(false)
  const [cookieConsent, setCookieConsent] = useState(false)
  const [eventDataConsent, setEventDataConsent] = useState(false)
  const [eventStatus, setEventStatus] = useState<'pending' | 'active' | 'finished' | null>(null)

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
        setEventStatus('finished')
        setEvent(eventData)
        setIsLoading(false)
        return
      }

      if (eventData.status === 'pending') {
        setError('Bu etkinlik henüz başlamadı. Lütfen host\'un etkinliği başlatmasını bekleyin.')
        setIsLoading(false)
        return
      }

      setEventStatus(eventData.status)
      setEvent(eventData)

      // Check for stored anonymous user
      const storedUser = getStoredAnonymousUser()
      console.log('loadEvent: Stored user:', storedUser ? 'found' : 'not found')
      if (storedUser) {
        try {
          console.log('loadEvent: Attempting to join event with stored user...')
          await joinEvent(storedUser.id, supabase, eventData)
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

    // Check if all required consents are given
    if (!gdprConsent || !policyConsent || !cookieConsent || !eventDataConsent) {
      setError('Lütfen tüm onayları kabul edin')
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

  const joinEvent = async (profileId: string, supabaseClient = createClient(), eventData?: Event) => {
    const eventToUse = eventData || event
    if (!eventToUse) {
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
        .eq('event_id', eventToUse.id)
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
          event_id: eventToUse.id,
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
      
      // Save consents to database
      await saveConsents(profileId, eventToUse.id, supabaseClient)
      
      setIsLoading(false)
    } catch (err) {
      const error = err as Error
      console.error('joinEvent: Exception:', error)
      setError(error.message || 'Failed to join event')
      setIsLoading(false)
      throw err // Re-throw to handle in handleUsernameSubmit
    }
  }

  const saveConsents = async (profileId: string, eventId: string, supabaseClient = createClient()) => {
    const consents: Array<{ profile_id: string; event_id: string | null; consent_type: ConsentType; consented: boolean }> = [
      { profile_id: profileId, event_id: null, consent_type: 'gdpr', consented: gdprConsent },
      { profile_id: profileId, event_id: null, consent_type: 'policy', consented: policyConsent },
      { profile_id: profileId, event_id: null, consent_type: 'cookie', consented: cookieConsent },
      { profile_id: profileId, event_id: eventId, consent_type: 'event_data_sharing', consented: eventDataConsent },
    ]

    try {
      // Insert or update each consent individually
      // Since we're using a unique index, we need to handle conflicts manually
      for (const consent of consents) {
        // First, try to delete existing consent if it exists
        await supabaseClient
          .from('consents')
          .delete()
          .eq('profile_id', consent.profile_id)
          .eq('consent_type', consent.consent_type)
          .is('event_id', consent.event_id === null ? null : consent.event_id)

        // Then insert the new consent
        const { error: consentError } = await supabaseClient
          .from('consents')
          .insert(consent)

        if (consentError) {
          console.error('Error saving consent:', consentError, consent)
        }
      }
    } catch (err) {
      console.error('Exception saving consents:', err)
      // Don't throw error here, as joining event is more important
    }
  }

  const subscribeToNotes = () => {
    if (!event || !participant) return () => {}

    const supabase = createClient()
    const currentEventId = event.id
    const currentParticipantId = participant.id
    const channel = supabase
      .channel(`notes:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notes',
          filter: `event_id=eq.${currentEventId}`,
        },
        async (payload: { new: { id: string } }) => {
          try {
            console.log('New note received:', payload.new.id)
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
              // Check if note already exists to prevent duplicates
              setNotes((prev) => {
                const exists = prev.some((n) => n.id === newNote.id)
                if (exists) {
                  console.log('Note already exists, skipping:', newNote.id)
                  return prev
                }
                console.log('Adding new note to feed:', newNote.id)
                // Add new note with default like count (will be 0)
                const noteWithLikes = {
                  ...newNote,
                  like_count: 0,
                  is_liked_by_current_user: false,
                } as NoteWithParticipant
                // Add to the beginning and sort: favorited first, then by created_at
                const updated = [noteWithLikes, ...prev]
                return updated.sort((a, b) => {
                  if (a.is_favorited && !b.is_favorited) return -1
                  if (!a.is_favorited && b.is_favorited) return 1
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                })
              })
            }
          } catch (err) {
            console.error('Error processing new note:', err)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notes',
          filter: `event_id=eq.${currentEventId}`,
        },
        (payload: { new: { id: string; is_favorited?: boolean } }) => {
          // Update note in local state and re-sort
          setNotes((prev) => {
            const updated = prev.map((note) =>
              note.id === payload.new.id ? { ...note, is_favorited: payload.new.is_favorited || false } : note
            )
            // Sort: favorited first, then by created_at
            return updated.sort((a, b) => {
              if (a.is_favorited && !b.is_favorited) return -1
              if (!a.is_favorited && b.is_favorited) return 1
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            })
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notes',
          filter: `event_id=eq.${currentEventId}`,
        },
        (payload: { old: { id: string } }) => {
          // Remove deleted note from local state
          setNotes((prev) => prev.filter((note) => note.id !== payload.old.id))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'note_likes',
        },
        async (payload: { new: { note_id: string; participant_id: string } }) => {
          // Fetch the note to check if it belongs to this event
          const { data: noteData } = await supabase
            .from('notes')
            .select('event_id')
            .eq('id', payload.new.note_id)
            .single()
          
          if (!noteData || noteData.event_id !== currentEventId) return

          // Update like count for the note
          setNotes((prev) =>
            prev.map((note) => {
              if (note.id === payload.new.note_id) {
                const newLikeCount = (note.like_count || 0) + 1
                const isLikedByCurrentUser = payload.new.participant_id === currentParticipantId
                return {
                  ...note,
                  like_count: newLikeCount,
                  is_liked_by_current_user: isLikedByCurrentUser || note.is_liked_by_current_user,
                }
              }
              return note
            })
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'note_likes',
        },
        async (payload: { old: { note_id: string; participant_id: string } }) => {
          // Fetch the note to check if it belongs to this event
          const { data: noteData } = await supabase
            .from('notes')
            .select('event_id')
            .eq('id', payload.old.note_id)
            .single()
          
          if (!noteData || noteData.event_id !== currentEventId) return

          // Update like count for the note
          setNotes((prev) =>
            prev.map((note) => {
              if (note.id === payload.old.note_id) {
                const newLikeCount = Math.max(0, (note.like_count || 0) - 1)
                const isLikedByCurrentUser = payload.old.participant_id === currentParticipantId 
                  ? false 
                  : note.is_liked_by_current_user
                return {
                  ...note,
                  like_count: newLikeCount,
                  is_liked_by_current_user: isLikedByCurrentUser,
                }
              }
              return note
            })
          )
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to notes channel')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error')
        } else if (status === 'TIMED_OUT') {
          console.error('Channel timed out')
        } else if (status === 'CLOSED') {
          console.log('Channel closed')
        }
      })

    // Load existing notes
    loadNotes(supabase)

    return () => {
      console.log('Cleaning up notes subscription')
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
    if (!event || !participant) return

    try {
      // First get all notes
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
        .order('is_favorited', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)

      if (notesError) {
        console.error('Error loading notes:', notesError)
        setError('Failed to load notes: ' + notesError.message)
        return
      }

      if (!notesData) return

      // Get like counts and check if current user liked each note
      const noteIds = notesData.map(n => n.id)
      const { data: likesData } = await supabaseClient
        .from('note_likes')
        .select('note_id, participant_id')
        .in('note_id', noteIds)

      // Calculate like counts and check if current user liked
      const notesWithLikes = notesData.map((note) => {
        const noteLikes = likesData?.filter(like => like.note_id === note.id) || []
        const likeCount = noteLikes.length
        const isLikedByCurrentUser = noteLikes.some(like => like.participant_id === participant.id)
        
        return {
          ...note,
          like_count: likeCount,
          is_liked_by_current_user: isLikedByCurrentUser,
        } as NoteWithParticipant
      })

      // Sort: favorited first, then by created_at
      const sortedNotes = notesWithLikes.sort((a, b) => {
        if (a.is_favorited && !b.is_favorited) return -1
        if (!a.is_favorited && b.is_favorited) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setNotes(sortedNotes)
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
      // Note will be added via realtime subscription, no need to reload
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

      // Note will be added via realtime subscription, no need to reload
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

      // Note will be added via realtime subscription, no need to reload
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to submit image')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleLike = async (noteId: string, isCurrentlyLiked: boolean) => {
    if (!participant || !event) return

    try {
      const supabase = createClient()
      
      if (isCurrentlyLiked) {
        // Unlike: delete the like
        const { error } = await supabase
          .from('note_likes')
          .delete()
          .eq('note_id', noteId)
          .eq('participant_id', participant.id)

        if (error) throw error
      } else {
        // Like: insert the like
        const { error } = await supabase
          .from('note_likes')
          .insert({
            note_id: noteId,
            participant_id: participant.id,
          })

        if (error) throw error
      }

      // Update local state
      setNotes((prev) =>
        prev.map((note) => {
          if (note.id === noteId) {
            const newLikeCount = isCurrentlyLiked 
              ? (note.like_count || 0) - 1 
              : (note.like_count || 0) + 1
            return {
              ...note,
              like_count: Math.max(0, newLikeCount),
              is_liked_by_current_user: !isCurrentlyLiked,
            }
          }
          return note
        })
      )
    } catch (err) {
      const error = err as Error
      console.error('Error toggling like:', error)
      setError('Beğeni işlemi başarısız: ' + error.message)
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <X className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Etkinlik Bulunamadı</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            <Home className="mr-2 h-4 w-4" />
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    )
  }

  if (eventStatus === 'finished' && event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="text-center space-y-6 max-w-lg px-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg mb-4 animate-pulse">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">{event.title}</h1>
            <p className="text-xl text-muted-foreground">Etkinlik Sona Erdi</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg border border-white/20">
            <p className="text-gray-600 mb-4">
              Bu etkinlik tamamlandı. Katıldığınız için teşekkür ederiz!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => router.push('/')} variant="default" className="w-full sm:w-auto">
                <Home className="mr-2 h-4 w-4" />
                Ana Sayfaya Dön
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showUsernamePrompt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-md px-6 space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Etkinliğe Katıl</h2>
            <p className="text-muted-foreground">Katılmak için adınızı girin ve onayları kabul edin</p>
          </div>
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}
            <Input
              type="text"
              placeholder="Adınız"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError(null)
              }}
              autoFocus
              disabled={isLoading}
            />
            
            <div className="space-y-3 pt-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="gdpr"
                  checked={gdprConsent}
                  onChange={(e) => setGdprConsent(e.target.checked)}
                  disabled={isLoading}
                  className="mt-1"
                />
                <label htmlFor="gdpr" className="text-sm leading-relaxed cursor-pointer">
                  GDPR veri koruma politikasını kabul ediyorum
                </label>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="policy"
                  checked={policyConsent}
                  onChange={(e) => setPolicyConsent(e.target.checked)}
                  disabled={isLoading}
                  className="mt-1"
                />
                <label htmlFor="policy" className="text-sm leading-relaxed cursor-pointer">
                  Kullanım şartlarını ve gizlilik politikasını kabul ediyorum
                </label>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="cookie"
                  checked={cookieConsent}
                  onChange={(e) => setCookieConsent(e.target.checked)}
                  disabled={isLoading}
                  className="mt-1"
                />
                <label htmlFor="cookie" className="text-sm leading-relaxed cursor-pointer">
                  Çerez kullanımını kabul ediyorum
                </label>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="event-data"
                  checked={eventDataConsent}
                  onChange={(e) => setEventDataConsent(e.target.checked)}
                  disabled={isLoading}
                  className="mt-1"
                />
                <label htmlFor="event-data" className="text-sm leading-relaxed cursor-pointer">
                  Etkinlik ile ilgili verilerimin paylaşılmasını kabul ediyorum
                </label>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={!username.trim() || isLoading || !event || !gdprConsent || !policyConsent || !cookieConsent || !eventDataConsent}
            >
              {isLoading ? 'Katılıyor...' : 'Katıl'}
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

            <EventFeed notes={notes} onToggleLike={handleToggleLike} />
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

