'use client'

import { createClient } from '@/lib/supabase'

export interface AnonymousUser {
  id: string
  username: string
}

const ANONYMOUS_USER_KEY = 'anonymous_user'

export async function getOrCreateAnonymousUser(username: string): Promise<AnonymousUser> {
  // Check localStorage first
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(ANONYMOUS_USER_KEY)
    if (stored) {
      try {
        const user = JSON.parse(stored)
        // Update username if different
        if (user.username !== username) {
          const updated = await updateAnonymousUsername(user.id, username)
          return updated
        }
        return user
      } catch {
        // Invalid stored data, continue to create new
      }
    }
  }

  // Create new anonymous user
  const supabase = createClient()
  
  // Generate a temporary UUID for anonymous user
  const tempId = crypto.randomUUID()
  
  // Insert profile (this will work with RLS if we allow anonymous inserts)
  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      id: tempId,
      username: username,
    })
    .select()
    .single()

  if (error) {
    // If insert fails (due to RLS), try to get existing or handle differently
    // For now, we'll use a workaround: create a profile that doesn't require auth
    // Note: This requires updating RLS policies to allow anonymous inserts
    throw new Error('Failed to create anonymous user: ' + error.message)
  }

  const user: AnonymousUser = {
    id: profile.id,
    username: profile.username,
  }

  // Store in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(user))
  }

  return user
}

async function updateAnonymousUsername(userId: string, username: string): Promise<AnonymousUser> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error('Failed to update username: ' + error.message)
  }

  const user: AnonymousUser = {
    id: data.id,
    username: data.username,
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(user))
  }

  return user
}

export function getStoredAnonymousUser(): AnonymousUser | null {
  if (typeof window === 'undefined') return null
  
  const stored = localStorage.getItem(ANONYMOUS_USER_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function clearAnonymousUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ANONYMOUS_USER_KEY)
  }
}

