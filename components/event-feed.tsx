'use client'

import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { NoteWithParticipant } from '@/types/database.types'
import { formatDistanceToNow } from 'date-fns'

interface EventFeedProps {
  notes: NoteWithParticipant[]
}

export function EventFeed({ notes }: EventFeedProps) {
  if (notes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No notes yet. Be the first to share!
      </div>
    )
  }

  return (
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

