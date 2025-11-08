'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LanguageSwitcher } from '@/components/language-switcher'
import { createClient } from '@/lib/supabase'
import { EventMode, NoteWithParticipant, Event } from '@/types/database.types'
import { QRCodeSVG } from 'qrcode.react'
import { LogOut, Send, Trash2, Edit2, X, Check, Star, Heart, MessageSquare, Image as ImageIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'

interface UserWithProfile {
  id: string
  email?: string
  profile?: {
    id: string
    username: string
  }
}

export default function HostDashboard() {
  const router = useRouter()
  const locale = useLocale()
  const supabase = createClient()
  const t = useTranslations('host')
  const tCommon = useTranslations('common')
  const tEvent = useTranslations('host.event')
  const tFeed = useTranslations('host.feed')
  const tCreate = useTranslations('host.createEvent')
  const [user, setUser] = useState<UserWithProfile | null>(null)
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)
  const [notes, setNotes] = useState<NoteWithParticipant[]>([])
  const [announcementText, setAnnouncementText] = useState('')
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventMode, setNewEventMode] = useState<EventMode>('general')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalLikes: 0,
    imageMessages: 0,
  })

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user) {
      loadCurrentEvent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (currentEvent) {
      subscribeToNotes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push(`/${locale}/auth/login`)
      return
    }
    setUser(session.user)

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profile) {
      setUser({ ...session.user, profile })
    }
  }

  const loadCurrentEvent = async () => {
    if (!user) return
    
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (events && events.length > 0) {
      setCurrentEvent(events[0])
    }
  }

  const subscribeToNotes = () => {
    if (!currentEvent) return

    const channel = supabase
      .channel(`notes:${currentEvent.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notes',
          filter: `event_id=eq.${currentEvent.id}`,
        },
        async (payload: { new: { id: string } }) => {
          const { data: newNote } = await supabase
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

          if (newNote) {
            setNotes((prev) => {
              // Add new note with default like count (will be 0)
              const noteWithLikes = {
                ...newNote,
                like_count: 0,
              } as NoteWithParticipant
              // Sort: favorited first, then by created_at
              const updated = [noteWithLikes, ...prev]
              const sorted = updated.sort((a: NoteWithParticipant, b: NoteWithParticipant) => {
                if (a.is_favorited && !b.is_favorited) return -1
                if (!a.is_favorited && b.is_favorited) return 1
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              })
              
              // Update stats
              const totalMessages = sorted.length
              const totalLikes = sorted.reduce((sum: number, note: NoteWithParticipant) => sum + (note.like_count || 0), 0)
              const imageMessages = sorted.filter((note: NoteWithParticipant) => note.content_type === 'image').length
              setStats({ totalMessages, totalLikes, imageMessages })
              
              return sorted
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'note_likes',
        },
        async (payload: { new: { note_id: string } }) => {
          // Check if note belongs to current event
          const { data: noteData } = await supabase
            .from('notes')
            .select('event_id')
            .eq('id', payload.new.note_id)
            .single()
          
          if (!noteData || !currentEvent || noteData.event_id !== currentEvent.id) return

          // Update like count
          setNotes((prev) => {
            const updated = prev.map((note) => {
              if (note.id === payload.new.note_id) {
                return {
                  ...note,
                  like_count: (note.like_count || 0) + 1,
                }
              }
              return note
            })
            
            // Update stats
            const totalMessages = updated.length
            const totalLikes = updated.reduce((sum: number, note: NoteWithParticipant) => sum + (note.like_count || 0), 0)
            const imageMessages = updated.filter((note: NoteWithParticipant) => note.content_type === 'image').length
            setStats({ totalMessages, totalLikes, imageMessages })
            
            return updated
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'note_likes',
        },
        async (payload: { old: { note_id: string } }) => {
          // Check if note belongs to current event
          const { data: noteData } = await supabase
            .from('notes')
            .select('event_id')
            .eq('id', payload.old.note_id)
            .single()
          
          if (!noteData || !currentEvent || noteData.event_id !== currentEvent.id) return

          // Update like count
          setNotes((prev) => {
            const updated = prev.map((note) => {
              if (note.id === payload.old.note_id) {
                return {
                  ...note,
                  like_count: Math.max(0, (note.like_count || 0) - 1),
                }
              }
              return note
            })
            
            // Update stats
            const totalMessages = updated.length
            const totalLikes = updated.reduce((sum: number, note: NoteWithParticipant) => sum + (note.like_count || 0), 0)
            const imageMessages = updated.filter((note: NoteWithParticipant) => note.content_type === 'image').length
            setStats({ totalMessages, totalLikes, imageMessages })
            
            return updated
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notes',
          filter: `event_id=eq.${currentEvent.id}`,
        },
        async (payload: { new: { id: string; is_favorited?: boolean } }) => {
          // Update note in local state and re-sort
          setNotes((prev) => {
            const updated = prev.map((note) =>
              note.id === payload.new.id ? { ...note, is_favorited: payload.new.is_favorited || false } : note
            )
            // Sort: favorited first, then by created_at
            return updated.sort((a: NoteWithParticipant, b: NoteWithParticipant) => {
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
          filter: `event_id=eq.${currentEvent.id}`,
        },
        (payload: { old: { id: string } }) => {
          // Remove deleted note from local state
          setNotes((prev) => prev.filter((note) => note.id !== payload.old.id))
        }
      )
      .subscribe()

    loadNotes()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const loadNotes = async () => {
    if (!currentEvent) return

    const { data: notesData } = await supabase
      .from('notes')
      .select(`
        *,
        participant:participants!inner(
          *,
          profile:profiles!inner(*)
        )
      `)
      .eq('event_id', currentEvent.id)
      .order('is_favorited', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)

    if (!notesData) return

    // Get like counts for all notes
    const noteIds = notesData.map((n: { id: string }) => n.id)
    const { data: likesData } = await supabase
      .from('note_likes')
      .select('note_id')
      .in('note_id', noteIds)

    // Calculate like counts
    const notesWithLikes = notesData.map((note: any) => {
      const likeCount = likesData?.filter((like: { note_id: string }) => like.note_id === note.id).length || 0
      return {
        ...note,
        like_count: likeCount,
      } as NoteWithParticipant
    })

    // Sort: favorited first, then by created_at
    const sortedNotes = notesWithLikes.sort((a: NoteWithParticipant, b: NoteWithParticipant) => {
      if (a.is_favorited && !b.is_favorited) return -1
      if (!a.is_favorited && b.is_favorited) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    setNotes(sortedNotes)

    // Calculate statistics
    const totalMessages = sortedNotes.length
    const totalLikes = sortedNotes.reduce((sum: number, note: NoteWithParticipant) => sum + (note.like_count || 0), 0)
    const imageMessages = sortedNotes.filter((note: NoteWithParticipant) => note.content_type === 'image').length

    setStats({
      totalMessages,
      totalLikes,
      imageMessages,
    })
  }

  const generateEventCode = async (): Promise<string> => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    
    // Try up to 10 times to find a unique code
    for (let attempt = 0; attempt < 10; attempt++) {
      code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      
      // Check if code exists
      const { data } = await supabase
        .from('events')
        .select('id')
        .eq('event_code', code)
        .single()
      
      if (!data) {
        return code
      }
    }
    
    // Fallback: add timestamp to ensure uniqueness
    return code + Date.now().toString().slice(-2)
  }

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim() || !user) return

    setIsCreatingEvent(true)
    try {
      const eventCode = await generateEventCode()

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          host_id: user.id,
          title: newEventTitle.trim(),
          event_code: eventCode,
          event_mode: newEventMode,
          status: 'pending',
        })
        .select()
        .single()

      if (eventError) {
        throw eventError
      }

      setCurrentEvent(eventData)
      setNewEventTitle('')
      setNewEventMode('general')
      setIsDialogOpen(false)
    } catch (err) {
      const error = err as Error
      alert(tCreate('error') + ': ' + error.message)
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const handleStartEvent = async () => {
    if (!currentEvent) return

    const { error } = await supabase
      .from('events')
      .update({ status: 'active' })
      .eq('id', currentEvent.id)

    if (error) {
      alert(t('errors.startFailed') + ': ' + error.message)
      return
    }

    setCurrentEvent({ ...currentEvent, status: 'active' })
  }

  const handlePauseEvent = async () => {
    if (!currentEvent) return

    const { error } = await supabase
      .from('events')
      .update({ status: 'pending' })
      .eq('id', currentEvent.id)

    if (error) {
      alert(t('errors.pauseFailed') + ': ' + error.message)
      return
    }

    setCurrentEvent({ ...currentEvent, status: 'pending' })
  }

  const handleEndEvent = async () => {
    if (!currentEvent) return

    if (!confirm(tEvent('endConfirm'))) {
      return
    }

    const { error } = await supabase
      .from('events')
      .update({ status: 'finished' })
      .eq('id', currentEvent.id)

    if (error) {
      alert(t('errors.endFailed') + ': ' + error.message)
      return
    }

    setCurrentEvent({ ...currentEvent, status: 'finished' })
  }

  const handleSendAnnouncement = async () => {
    if (!announcementText.trim() || !currentEvent) return

    const channel = supabase.channel(`event:${currentEvent.event_code}`)
    await channel.send({
      type: 'broadcast',
      event: 'announcement',
      payload: { message: announcementText.trim() },
    })

    setAnnouncementText('')
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm(tFeed('deleteConfirm'))) {
      return
    }

    setDeletingNoteId(noteId)
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)

      if (error) {
        alert(tFeed('deleteError') + ': ' + error.message)
        return
      }

      // Remove note from local state and update stats
      setNotes((prev) => {
        const updated = prev.filter((note) => note.id !== noteId)
        
        // Update stats
        const totalMessages = updated.length
        const totalLikes = updated.reduce((sum: number, note: NoteWithParticipant) => sum + (note.like_count || 0), 0)
        const imageMessages = updated.filter((note: NoteWithParticipant) => note.content_type === 'image').length
        setStats({ totalMessages, totalLikes, imageMessages })
        
        return updated
      })
    } catch (err) {
      const error = err as Error
      alert(tFeed('deleteError') + ': ' + error.message)
    } finally {
      setDeletingNoteId(null)
    }
  }

  const handleStartEditTitle = () => {
    if (!currentEvent) return
    setEditingTitle(currentEvent.title)
    setIsEditingTitle(true)
  }

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false)
    setEditingTitle('')
  }

  const handleSaveTitle = async () => {
    if (!currentEvent || !editingTitle.trim()) return

    const { error } = await supabase
      .from('events')
      .update({ title: editingTitle.trim() })
      .eq('id', currentEvent.id)

    if (error) {
      alert(tEvent('titleUpdateError') + ': ' + error.message)
      return
    }

    setCurrentEvent({ ...currentEvent, title: editingTitle.trim() })
    setIsEditingTitle(false)
    setEditingTitle('')
  }

  const handleToggleFavorite = async (noteId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_favorited: !currentFavorite })
        .eq('id', noteId)

      if (error) {
        alert(tFeed('favoriteError') + ': ' + error.message)
        return
      }

      // Update local state
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId ? { ...note, is_favorited: !currentFavorite } : note
        )
      )
    } catch (err) {
      const error = err as Error
      alert(tFeed('favoriteError') + ': ' + error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push(`/${locale}`)
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t('dashboard')}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {tCommon('logout')}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!currentEvent ? (
          <div className="max-w-md mx-auto text-center space-y-6 py-12">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">{t('noEvent.title')}</h2>
              <p className="text-muted-foreground">{t('noEvent.subtitle')}</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="shadow-sm">
                  {t('noEvent.createButton')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{tCreate('title')}</DialogTitle>
                  <DialogDescription>
                    {tCreate('description')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <label htmlFor="event-title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {tCreate('eventTitle')}
                    </label>
                    <Input
                      id="event-title"
                      placeholder={tCreate('eventTitlePlaceholder')}
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      className="h-10"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newEventTitle.trim() && !isCreatingEvent) {
                          handleCreateEvent()
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="event-mode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {tCreate('eventMode')}
                    </label>
                    <Select value={newEventMode} onValueChange={(value) => setNewEventMode(value as EventMode)}>
                      <SelectTrigger id="event-mode" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{tCreate('modes.general')}</SelectItem>
                        <SelectItem value="birthday">{tCreate('modes.birthday')}</SelectItem>
                        <SelectItem value="party">{tCreate('modes.party')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isCreatingEvent}
                  >
                    {tCreate('cancel')}
                  </Button>
                  <Button 
                    onClick={handleCreateEvent} 
                    disabled={!newEventTitle.trim() || isCreatingEvent}
                    className="min-w-[100px]"
                  >
                    {isCreatingEvent ? tCreate('creating') : tCreate('create')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  {isEditingTitle ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveTitle()
                          } else if (e.key === 'Escape') {
                            handleCancelEditTitle()
                          }
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSaveTitle}
                        disabled={!editingTitle.trim()}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleCancelEditTitle}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="flex-1">{currentEvent.title}</CardTitle>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleStartEditTitle}
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{tEvent('eventCode')}</p>
                    <p className="text-2xl font-mono font-bold">{currentEvent.event_code}</p>
                  </div>

                  <div className="flex justify-center p-4 bg-white rounded-lg border">
                    <QRCodeSVG
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/event/${currentEvent.event_code}`}
                      size={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{tEvent('status')}: <span className="font-medium capitalize">{tEvent(`statuses.${currentEvent.status}`)}</span></p>
                    <div className="flex flex-col gap-2">
                      {currentEvent.status === 'pending' && (
                        <Button onClick={handleStartEvent} className="w-full">
                          {tEvent('start')}
                        </Button>
                      )}
                      {currentEvent.status === 'active' && (
                        <>
                          <Button onClick={handlePauseEvent} variant="outline" className="w-full">
                            {tEvent('pause')}
                          </Button>
                          <Button onClick={handleEndEvent} variant="destructive" className="w-full">
                            {tEvent('end')}
                          </Button>
                        </>
                      )}
                      {currentEvent.status === 'finished' && (
                        <>
                          <div className="bg-muted/50 rounded-lg p-3 mb-2">
                            <p className="text-sm text-muted-foreground text-center">
                              {tEvent('finished')}
                            </p>
                          </div>
                          <Button onClick={handleStartEvent} className="w-full">
                            {tEvent('restart')}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">{tEvent('announcement')}</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder={tEvent('announcementPlaceholder')}
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSendAnnouncement()
                          }
                        }}
                      />
                      <Button onClick={handleSendAnnouncement} disabled={!announcementText.trim()} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{tFeed('title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {notes.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      {tFeed('noNotes')}
                    </div>
                  ) : (
                    <>
                      {/* Statistics Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <MessageSquare className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">{tFeed('stats.totalMessages')}</p>
                                <p className="text-2xl font-bold">{stats.totalMessages}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 rounded-lg">
                                <Heart className="h-5 w-5 text-red-600 fill-red-600" />
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">{tFeed('stats.totalLikes')}</p>
                                <p className="text-2xl font-bold">{stats.totalLikes}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <ImageIcon className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">{tFeed('stats.imageMessages')}</p>
                                <p className="text-2xl font-bold">{stats.imageMessages}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Notes List */}
                      <div className="space-y-4">
                      {notes.map((note) => (
                        <Card key={note.id} className={note.is_favorited ? 'border-yellow-400 border-2 bg-yellow-50/50' : ''}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {note.participant.profile.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2">
                                    {note.is_favorited && (
                                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                    )}
                                    <span className="font-medium text-sm">
                                      {note.participant.profile.username}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className={`h-7 w-7 ${note.is_favorited ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-100' : 'text-muted-foreground hover:text-yellow-500'}`}
                                      onClick={() => handleToggleFavorite(note.id, note.is_favorited || false)}
                                      title={note.is_favorited ? tFeed('unfavoriteTitle') : tFeed('favoriteTitle')}
                                    >
                                      <Star className={`h-3.5 w-3.5 ${note.is_favorited ? 'fill-current' : ''}`} />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteNote(note.id)}
                                      disabled={deletingNoteId === note.id}
                                      title={tFeed('deleteTitle')}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  {note.content_type === 'text' && (
                                    <p className="text-sm whitespace-pre-wrap">{note.content_data}</p>
                                  )}
                                  {note.content_type === 'image' && (
                                    <Image
                                      src={note.content_data}
                                      alt="Shared image"
                                      width={500}
                                      height={300}
                                      className="max-w-full h-auto rounded-md mt-2"
                                    />
                                  )}
                                  {note.content_type === 'emotion' && (
                                    <div className="text-4xl">{note.content_data}</div>
                                  )}
                                </div>
                                {(note.like_count !== undefined && note.like_count > 0) && (
                                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                    <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                                    <span>{note.like_count} {tCommon('likes')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

