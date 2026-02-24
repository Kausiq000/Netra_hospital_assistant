/**
 * Appointment Store (Supabase-backed)
 * All state lives in Supabase tables with realtime push.
 * Same hook names / action signatures as before so existing pages work unchanged.
 */
"use client"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState, useEffect, useRef } from "react"
import { supabase } from "./supabase"

// Unique channel IDs so multiple hook instances don't collide
let _apptChannelCounter = 0
function uid(name: string) { return `${name}-${++_apptChannelCounter}` }

// ─── Types ────────────────────────────────────────────────────────────────────

export type RequestStatus = "pending" | "approved" | "rejected"

export interface AppointmentRequest {
  id: string
  patientName: string
  doctorId: string
  doctorName: string
  specialty: string
  slot: string
  status: RequestStatus
  requestedAt: Date
}

export interface AffectedPatient {
  id: string
  patientName: string
  time: string
  concern: string
  rescheduledTo?: string
}

export interface SurgeryAlert {
  active: boolean
  doctorName: string
  duration: string
  startedAt: Date | null
  affectedPatients: AffectedPatient[]
}

export interface EmergencyAlert {
  active: boolean
  triggeredAt: Date | null
  message: string
  triggeredBy: string
}

export type DoctorStatus = "available" | "in-surgery" | "on-leave" | "busy"

export interface DoctorAvailability {
  id: string
  name: string
  specialty: string
  status: DoctorStatus
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function submitAppointmentRequest(
  req: Omit<AppointmentRequest, "id" | "status" | "requestedAt">
): Promise<string> {
  const { data, error } = await supabase
    .from("appointment_requests")
    .insert({
      patient_name: req.patientName,
      doctor_id: req.doctorId,
      doctor_name: req.doctorName,
      specialty: req.specialty,
      slot: req.slot,
      status: "pending",
    })
    .select("id")
    .single()

  if (error || !data) throw new Error(error?.message ?? "Request failed")
  return data.id as string
}

export async function approveAppointmentRequest(id: string): Promise<void> {
  await supabase.from("appointment_requests").update({ status: "approved" }).eq("id", id)
}

export async function rejectAppointmentRequest(id: string): Promise<void> {
  await supabase.from("appointment_requests").update({ status: "rejected" }).eq("id", id)
}

export async function triggerEmergencySurgery(
  doctorName: string,
  duration: string,
  affectedPatients: AffectedPatient[]
): Promise<void> {
  // Deactivate any previous alert first
  await supabase.from("surgery_alerts").update({ active: false }).eq("active", true)

  const { data: alert } = await supabase
    .from("surgery_alerts")
    .insert({ active: true, doctor_name: doctorName, duration, started_at: new Date().toISOString() })
    .select("id")
    .single()

  if (alert?.id && affectedPatients.length > 0) {
    await supabase.from("surgery_affected_appointments").insert(
      affectedPatients.map((p) => ({
        surgery_alert_id: alert.id,
        patient_name: p.patientName,
        original_time: p.time,
        concern: p.concern,
      }))
    )
  }

  // Update doctor status
  await supabase
    .from("doctors")
    .update({ status: "in-surgery" })
    .eq("name", doctorName)
}

export async function deactivateSurgery(): Promise<void> {
  const { data: alert } = await supabase
    .from("surgery_alerts")
    .select("doctor_name")
    .eq("active", true)
    .single()

  await supabase.from("surgery_alerts").update({ active: false }).eq("active", true)

  if (alert?.doctor_name) {
    await supabase.from("doctors").update({ status: "available" }).eq("name", alert.doctor_name)
  }
}

export async function rescheduleAffectedPatient(patientId: string, newSlot: string): Promise<void> {
  await supabase
    .from("surgery_affected_appointments")
    .update({ rescheduled_to: newSlot })
    .eq("id", patientId)
}

export async function triggerEmergencyAlert(
  message: string,
  // triggeredBy is a UUID FK — pass the auth user id or leave null
  triggeredById?: string
): Promise<void> {
  await supabase.from("emergency_alerts").update({ active: false }).eq("active", true)
  await supabase.from("emergency_alerts").insert({
    active: true,
    message,
    ...(triggeredById ? { triggered_by: triggeredById } : {}),
  })
}

export async function dismissEmergencyAlert(): Promise<void> {
  await supabase.from("emergency_alerts").update({ active: false }).eq("active", true)
}

export async function updateDoctorStatus(doctorId: string, status: DoctorStatus): Promise<void> {
  await supabase.from("doctors").update({ status }).eq("id", doctorId)
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAppointmentRequests(): AppointmentRequest[] {
  const [requests, setRequests] = useState<AppointmentRequest[]>([])
  const channelId = useRef(uid("appt-requests-watch"))

  useEffect(() => {
    const load = () =>
      supabase
        .from("appointment_requests")
        .select("*")
        .order("created_at", { ascending: false })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ data }) => { if (data) setRequests(data.map((r: any) => ({
            id: r.id,
            patientName: r.patient_name,
            doctorId: r.doctor_id,
            doctorName: r.doctor_name,
            specialty: r.specialty,
            slot: r.slot,
            status: r.status as RequestStatus,
            requestedAt: new Date(r.created_at),
          })))
        })

    load()

    const channel = supabase
      .channel(channelId.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointment_requests" }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return requests
}

export function useSurgeryAlert(): SurgeryAlert {
  const [alert, setAlert] = useState<SurgeryAlert>({
    active: false,
    doctorName: "",
    duration: "",
    startedAt: null,
    affectedPatients: [],
  })
  const channelId = useRef(uid("surgery-alert-watch"))

  useEffect(() => {
    const load = async () => {
      const { data: alertRow } = await supabase
        .from("surgery_alerts")
        .select("*")
        .eq("active", true)
        .single()

      if (!alertRow) {
        setAlert({ active: false, doctorName: "", duration: "", startedAt: null, affectedPatients: [] })
        return
      }

      const { data: affected } = await supabase
        .from("surgery_affected_appointments")
        .select("*")
        .eq("surgery_alert_id", alertRow.id)

      setAlert({
        active: true,
        doctorName: alertRow.doctor_name,
        duration: alertRow.duration,
        startedAt: alertRow.started_at ? new Date(alertRow.started_at) : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        affectedPatients: (affected ?? []).map((p: any) => ({
          id: p.id,
          patientName: p.patient_name,
          time: p.original_time,
          concern: p.concern,
          rescheduledTo: p.rescheduled_to ?? undefined,
        })),
      })
    }

    load()

    const channel = supabase
      .channel(channelId.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "surgery_alerts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "surgery_affected_appointments" }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return alert
}

export function useEmergencyAlert(): EmergencyAlert {
  const [alert, setAlert] = useState<EmergencyAlert>({
    active: false,
    triggeredAt: null,
    message: "",
    triggeredBy: "",
  })

  useEffect(() => {
    const load = () =>
      supabase
        .from("emergency_alerts")
        .select("*")
        .eq("active", true)
        .single()
        .then(({ data }) => {
          if (data) {
            setAlert({
              active: true,
              triggeredAt: data.triggered_at ? new Date(data.triggered_at) : null,
              message: data.message,
              // triggered_by is a UUID in DB; display generic label
              triggeredBy: data.triggered_by ? "Admin" : "System",
            })
          } else {
            setAlert({ active: false, triggeredAt: null, message: "", triggeredBy: "" })
          }
        })

    load()

    const channel = supabase
      .channel("emergency-alert-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_alerts" }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return alert
}

export function useDoctorAvailability(): DoctorAvailability[] {
  const [doctors, setDoctors] = useState<DoctorAvailability[]>([])
  const channelId = useRef(uid("doctors-watch"))

  useEffect(() => {
    const load = () =>
      supabase
        .from("doctors")
        .select("*")
        .order("name")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ data }) => { if (data) setDoctors(data.map((d: any) => ({
            id: d.id,
            name: d.name,
            specialty: d.specialty,
            status: d.status as DoctorStatus,
          })))
        })

    load()

    const channel = supabase
      .channel(channelId.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "doctors" }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return doctors
}
