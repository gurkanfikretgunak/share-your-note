import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Only create client in browser environment
  if (typeof window === 'undefined') {
    // Return a mock client for SSR
    return {
      auth: {
        signInWithPassword: async () => ({ error: null }),
        signUp: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
      }),
      channel: () => ({
        on: () => ({ subscribe: () => ({}) }),
        send: async () => {},
      }),
      removeChannel: () => {},
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
    } as any
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your environment configuration.'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

