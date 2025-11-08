'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'

interface HostAnnouncement {
  message: string
  timestamp: string
}

interface HostAnnouncementProps {
  eventCode: string
}

export function HostAnnouncement({ eventCode }: HostAnnouncementProps) {
  const [announcements, setAnnouncements] = useState<HostAnnouncement[]>([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel(`event:${eventCode}`)

    channel
      .on('broadcast', { event: 'announcement' }, (payload: { payload: { message: string } }) => {
        setAnnouncements((prev) => [
          {
            message: payload.payload.message,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventCode, supabase])

  if (announcements.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 mb-6">
      {announcements.map((announcement, index) => (
        <Card key={index} className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-primary mb-1">Host Announcement</p>
                <p className="text-sm">{announcement.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

