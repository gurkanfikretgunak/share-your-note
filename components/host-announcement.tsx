'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
  const [currentAnnouncement, setCurrentAnnouncement] = useState<HostAnnouncement | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel(`event:${eventCode}`)

    channel
      .on('broadcast', { event: 'announcement' }, (payload: { payload: { message: string } }) => {
        const newAnnouncement = {
          message: payload.payload.message,
          timestamp: new Date().toISOString(),
        }
        setAnnouncements((prev) => [newAnnouncement, ...prev])
        // Show dialog for new announcement
        setCurrentAnnouncement(newAnnouncement)
        setIsDialogOpen(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventCode, supabase])

  return (
    <>
      {/* Dialog for new announcements */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-primary">Host Announcement</DialogTitle>
            <DialogDescription>
              The host has sent an important message
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base">{currentAnnouncement?.message}</p>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setIsDialogOpen(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show previous announcements as cards */}
      {announcements.length > 0 && (
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
      )}
    </>
  )
}

