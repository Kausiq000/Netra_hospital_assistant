import { createServiceClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

/**
 * POST /api/seed-demo-users
 *
 * Creates (or re-creates) the four demo accounts:
 *   ravi    / 123   → patient
 *   anitha  / 234   → nurse
 *   arun    / 345   → doctor
 *   ramesh  / 456   → admin
 *
 * Actual Supabase passwords are prefixed with "Netra@" (Netra@123 etc.)
 * so they meet the 6-character minimum.
 * The login page tries both the raw password and Netra@{password},
 * so users just type "123", "234", etc.
 *
 * Call once from the login page "Initialize Demo Users" button.
 */

const DEMO_USERS = [
  { username: "ravi",   name: "Ravi Kumar",    role: "patient", shortPwd: "123" },
  { username: "anitha", name: "Anitha Sharma",  role: "nurse",   shortPwd: "234" },
  { username: "arun",   name: "Arun Mehta",     role: "doctor",  shortPwd: "345" },
  { username: "ramesh", name: "Ramesh Gupta",   role: "admin",   shortPwd: "456" },
] as const

export async function POST() {
  const admin = createServiceClient()
  const results: { username: string; status: string }[] = []

  for (const u of DEMO_USERS) {
    const email    = `${u.username}@netra.hospital`
    const password = `Netra@${u.shortPwd}`

    // Try to create; if user already exists, update password instead
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role },
    })

    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        // User exists — update their password to make sure it's correct
        const { data: listData } = await admin.auth.admin.listUsers()
        const existing = listData?.users.find((usr) => usr.email === email)
        if (existing) {
          await admin.auth.admin.updateUserById(existing.id, { password })
          // Also ensure public.users row exists
          await admin.from("users").upsert({
            id: existing.id,
            name: u.name,
            role: u.role,
            username: u.username,
          })
        }
        results.push({ username: u.username, status: "updated" })
      } else {
        results.push({ username: u.username, status: `error: ${error.message}` })
      }
      continue
    }

    // Insert into public.users
    if (data?.user) {
      await admin.from("users").upsert({
        id: data.user.id,
        name: u.name,
        role: u.role,
        username: u.username,
      })
    }
    results.push({ username: u.username, status: "created" })
  }

  return NextResponse.json({ ok: true, results })
}
