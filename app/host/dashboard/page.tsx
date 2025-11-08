'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase'
import { EventMode, NoteWithParticipant, Event } from '@/types/database.types'
import { QRCodeSVG } from 'qrcode.react'
import { LogOut, Send, Trash2, Edit2, X, Check } from 'lucide-react'
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
  const supabase = createClient()
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
      router.push('/auth/login')
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
            setNotes((prev) => [newNote as NoteWithParticipant, ...prev])
          }
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
      .order('created_at', { ascending: false })
      .limit(100)

    if (notesData) {
      setNotes(notesData as NoteWithParticipant[])
    }
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
      alert('Failed to create event: ' + error.message)
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
      alert('Failed to start event: ' + error.message)
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
      alert('Failed to pause event: ' + error.message)
      return
    }

    setCurrentEvent({ ...currentEvent, status: 'pending' })
  }

  const handleEndEvent = async () => {
    if (!currentEvent) return

    if (!confirm('Are you sure you want to end this event? This action cannot be undone.')) {
      return
    }

    const { error } = await supabase
      .from('events')
      .update({ status: 'finished' })
      .eq('id', currentEvent.id)

    if (error) {
      alert('Failed to end event: ' + error.message)
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
    if (!confirm('Bu mesajı silmek istediğinizden emin misiniz?')) {
      return
    }

    setDeletingNoteId(noteId)
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)

      if (error) {
        alert('Mesaj silinirken hata oluştu: ' + error.message)
        return
      }

      // Remove note from local state
      setNotes((prev) => prev.filter((note) => note.id !== noteId))
    } catch (err) {
      const error = err as Error
      alert('Mesaj silinirken hata oluştu: ' + error.message)
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
      alert('Başlık güncellenirken hata oluştu: ' + error.message)
      return
    }

    setCurrentEvent({ ...currentEvent, title: editingTitle.trim() })
    setIsEditingTitle(false)
    setEditingTitle('')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Host Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!currentEvent ? (
          <div className="max-w-md mx-auto text-center space-y-6 py-12">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">Henüz Etkinlik Yok</h2>
              <p className="text-muted-foreground">Başlamak için yeni bir etkinlik oluşturun</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="shadow-sm">
                  Yeni Etkinlik Oluştur
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Yeni Etkinlik Oluştur</DialogTitle>
                  <DialogDescription>
                    Katılımcıların katılabileceği yeni bir etkinlik oluşturun. Etkinlik kodu otomatik olarak oluşturulacaktır.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <label htmlFor="event-title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Etkinlik Başlığı
                    </label>
                    <Input
                      id="event-title"
                      placeholder="Örn: Yılbaşı Partisi"
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
                      Etkinlik Modu
                    </label>
                    <Select value={newEventMode} onValueChange={(value) => setNewEventMode(value as EventMode)}>
                      <SelectTrigger id="event-mode" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Genel</SelectItem>
                        <SelectItem value="birthday">Doğum Günü</SelectItem>
                        <SelectItem value="party">Parti</SelectItem>
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
                    İptal
                  </Button>
                  <Button 
                    onClick={handleCreateEvent} 
                    disabled={!newEventTitle.trim() || isCreatingEvent}
                    className="min-w-[100px]"
                  >
                    {isCreatingEvent ? 'Oluşturuluyor...' : 'Oluştur'}
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
                    <p className="text-sm text-muted-foreground mb-2">Event Code</p>
                    <p className="text-2xl font-mono font-bold">{currentEvent.event_code}</p>
                  </div>

                  <div className="flex justify-center p-4 bg-white rounded-lg border">
                    <QRCodeSVG
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/event/${currentEvent.event_code}`}
                      size={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Status: <span className="font-medium capitalize">{currentEvent.status}</span></p>
                    <div className="flex flex-col gap-2">
                      {currentEvent.status === 'pending' && (
                        <Button onClick={handleStartEvent} className="w-full">
                          Etkinliği Başlat
                        </Button>
                      )}
                      {currentEvent.status === 'active' && (
                        <>
                          <Button onClick={handlePauseEvent} variant="outline" className="w-full">
                            Etkinliği Duraklat
                          </Button>
                          <Button onClick={handleEndEvent} variant="destructive" className="w-full">
                            Etkinliği Bitir
                          </Button>
                        </>
                      )}
                      {currentEvent.status === 'finished' && (
                        <>
                          <div className="bg-muted/50 rounded-lg p-3 mb-2">
                            <p className="text-sm text-muted-foreground text-center">
                              Bu etkinlik sona erdi
                            </p>
                          </div>
                          <Button onClick={handleStartEvent} className="w-full">
                            Etkinliği Tekrar Başlat
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Send Announcement</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Announcement message..."
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
                  <CardTitle>Attendee Feed</CardTitle>
                </CardHeader>
                <CardContent>
                  {notes.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      No notes yet. Share the event code with attendees!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <Card key={note.id}>
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
                                    <span className="font-medium text-sm">
                                      {note.participant.profile.username}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteNote(note.id)}
                                    disabled={deletingNoteId === note.id}
                                    title="Mesajı Sil"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
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
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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

