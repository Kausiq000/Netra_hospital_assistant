import { createServiceClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

/**
 * POST /api/create-patient-user
 * Body: { name: string }
 *
 * Creates a Supabase Auth user for a newly registered patient.
 * - username : name in lowercase, spaces removed (e.g. "Ravi Kumar" → "ravikumar")
 * - email    : {username}@netra.hospital
 * - password : same as username (what the patient typed as their name, lowercased)
 *              Stored in Supabase as "Netra@{username}" to meet 6-char minimum.
 *              loginWithCredentials tries both raw and Netra@ prefix transparently.
 *
 * Returns: { username, displayPassword } — shown to patient after registration.
 */
export async function POST(req: Request) {
  try {
    const { name } = (await req.json()) as { name: string }

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    // username = name lowercased, spaces stripped
    const username = name.trim().toLowerCase().replace(/\s+/g, "")
    const email = `${username}@netra.hospital`
    const supabasePassword = `Netra@${username}` // meets Supabase ≥ 6-char rule
    const displayPassword = username              // what the patient types to log in

    const admin = createServiceClient()

    // Create the Auth user (skip if already exists — duplicate patient names)
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: supabasePassword,
      email_confirm: true,
      user_metadata: { name: name.trim(), role: "patient" },
    })

    if (error && !error.message.toLowerCase().includes("already")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Upsert into public.users so the patient can be listed if needed
    if (data?.user) {
      await admin.from("users").upsert({
        id: data.user.id,
        name: name.trim(),
        role: "patient",
        username,
      })
    }

    return NextResponse.json({ username, displayPassword })
  } catch (err) {
    console.error("[create-patient-user]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
