export type EventMode = 'general' | 'birthday' | 'party'
export type EventStatus = 'pending' | 'active' | 'finished'
export type ParticipantRole = 'host' | 'attendee'
export type ContentType = 'text' | 'image' | 'emotion'

export interface Profile {
  id: string
  username: string
  created_at: string
}

export interface Event {
  id: string
  host_id: string
  title: string
  event_code: string
  event_mode: EventMode
  status: EventStatus
  created_at: string
}

export interface Participant {
  id: string
  event_id: string
  profile_id: string
  role: ParticipantRole
  joined_at: string
}

export interface Note {
  id: string
  event_id: string
  participant_id: string
  content_type: ContentType
  content_data: string
  created_at: string
}

export interface NoteWithParticipant extends Note {
  participant: Participant & {
    profile: Profile
  }
}

