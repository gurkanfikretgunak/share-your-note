'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { NoteWithParticipant } from '@/types/database.types'
import { formatDistanceToNow } from 'date-fns'

interface EventFeedProps {
  notes: NoteWithParticipant[]
}

export function EventFeed({ notes }: EventFeedProps) {
  const prevNotesLengthRef = useRef(notes.length)
  const firstNoteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // If a new note was added (length increased), scroll to top
    if (notes.length > prevNotesLengthRef.current && firstNoteRef.current) {
      // Smooth scroll to top
      firstNoteRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    prevNotesLengthRef.current = notes.length
  }, [notes.length])

  if (notes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No notes yet. Be the first to share!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {notes.map((note, index) => (
        <Card 
          key={note.id} 
          ref={index === 0 ? firstNoteRef : null}
          className="animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar>
                <AvatarFallback>
                  {note.participant.profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {note.participant.profile.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
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
  )
}

