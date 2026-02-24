"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { User, UserRole } from "@/lib/auth-store"

const AUTH_CACHE_KEY = "netra-auth-cache"

function getCachedUser(): User | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function setCachedUser(user: User | null) {
  if (typeof window === "undefined") return
  try {
    if (user) {
      sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user))
    } else {
      sessionStorage.removeItem(AUTH_CACHE_KEY)
    }
  } catch { /* ignore quota errors */ }
}

export function useAuth(): User | null {
  const [user, setUser] = useState<User | null>(getCachedUser)
  const loadingRef = useRef(false)

  useEffect(() => {
    async function loadProfile(userId: string, email: string) {
      // Prevent duplicate concurrent loads
      if (loadingRef.current) return
      loadingRef.current = true

      const { data: profile } = await supabase
        .from("users")
        .select("name, role")
        .eq("id", userId)
        .single()

      loadingRef.current = false

      if (profile) {
        const u: User = { id: userId, name: profile.name as string, role: profile.role as UserRole, email }
        setUser(u)
        setCachedUser(u)
      } else {
        setUser(null)
        setCachedUser(null)
      }
    }

    // Hydrate from existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email!)
      } else {
        // No session — clear cache
        setUser(null)
        setCachedUser(null)
      }
    })

    // React to future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email!)
      } else {
        setUser(null)
        setCachedUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return user
}
