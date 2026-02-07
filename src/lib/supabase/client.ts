import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  // Build time par crash se bachne ke liye hum variables ko function ke andar check karte hain
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Next.js build worker ise dekh kar error nahi dega
  if (!supabaseUrl || !supabaseAnonKey) {
    return createBrowserClient<Database>(
      "https://placeholder.supabase.co", // Dummy URL sirf build pass karne ke liye
      "placeholder-key"
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Agar aapko check lagana hai toh wo sirf development mode ke liye rakhen
if (process.env.NODE_ENV === 'development') {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("Supabase environment variables are missing in development!");
  }
}