// ── Supabase Auth Store ───────────────────────────────────────────────────
// Demo staff credentials (stored in Supabase as Netra@{password}):
//   Patient → ravi / 123        Nurse  → anitha / 234
//   Doctor  → arun / 345        Admin  → ramesh / 456
//
// Registered patients get:
//   username = their full name lowercased + spaces removed (e.g. "ravikumar")
//   password = same as username (typed as-is; Supabase stores "Netra@{username}")
//
// loginWithCredentials tries both raw password and Netra@{password} transparently.

import { supabase } from "./supabase"

export type UserRole = "patient" | "nurse" | "doctor" | "admin"

export interface User {
  id: string
  name: string
  role: UserRole
  email: string
}

/** Convert a plain username into its Supabase email. */
function toEmail(usernameOrEmail: string): string {
  if (usernameOrEmail.includes("@")) return usernameOrEmail
  return `${usernameOrEmail.trim().toLowerCase()}@netra.hospital`
}

/**
 * Sign in with Supabase Auth.
 * Tries the password as-is first, then with "Netra@" prefix,
 * so short demo passwords (123, 234…) work transparently.
 */
export async function loginWithCredentials(
  username: string,
  password: string
): Promise<User | null> {
  const email = toEmail(username.trim())

  // Candidates: raw password, then Netra@{password} (for short/simple ones)
  const candidates = [password, `Netra@${password}`]

  let userId: string | null = null
  let userEmail: string = email

  for (const pwd of candidates) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pwd })
    if (!error && data.user) {
      userId = data.user.id
      userEmail = data.user.email!
      break
    }
  }

  if (!userId) return null

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", userId)
    .single()

  if (profileError || !profile) return null

  const user: User = {
    id: userId,
    name: profile.name as string,
    role: profile.role as UserRole,
    email: userEmail,
  }

  // Warm the session cache so useAuth picks it up instantly
  try { sessionStorage.setItem("netra-auth-cache", JSON.stringify(user)) } catch { /* ignore */ }

  return user
}

/** Sign out the current Supabase session. */
export async function logout(): Promise<void> {
  try { sessionStorage.removeItem("netra-auth-cache") } catch { /* ignore */ }
  await supabase.auth.signOut()
}

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case "patient": return "/patient"
    case "nurse":   return "/nurse"
    case "doctor":  return "/doctor"
    case "admin":   return "/reception"
  }
}
