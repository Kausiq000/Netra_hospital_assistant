"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { Patient, Bed, HospitalStats, ActivityLog } from "@/lib/types"

// Each hook call gets a unique channel ID so multiple mounted instances
// don't collide and silently kill each other's Supabase subscriptions.
let _channelCounter = 0
function uid(name: string) { return `${name}-${++_channelCounter}` }

/** Severe patients who have been waiting longer than this get auto-escalated to critical */
export const SEVERE_ESCALATION_MINUTES = 15

// ── Row mappers ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPatient(row: any): Patient {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    symptoms: row.symptoms,
    selfAssessedSeverity: row.self_assessed_severity,
    verifiedPriority: row.verified_priority,
    wardType: row.ward_type,
    status: row.status,
    tokenNumber: row.token_number ?? 0,
    queuePosition: row.queue_position ?? 0,
    estimatedWaitTime: row.estimated_wait_time ?? 0,
    bedId: row.bed_id ?? null,
    createdAt: new Date(row.created_at),
    nurseVerified: row.nurse_verified ?? false,
    admissionRequested: row.admission_requested ?? false,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBed(row: any): Bed {
  return {
    id: row.id,
    number: row.number,
    type: row.type,
    status: row.status,
    patientId: row.patient_id ?? null,
    floor: row.floor ?? 1,
  }
}

function computeStats(patients: Patient[], beds: Bed[]): HospitalStats {
  const totalBeds = beds.length
  const occupiedBeds = beds.filter((b) => b.status === "occupied").length
  const availableBeds = beds.filter((b) => b.status === "available").length
  const icuBeds = beds.filter((b) => b.type === "icu")
  const emergencyBeds = beds.filter((b) => b.type === "emergency")
  const generalBeds = beds.filter((b) => b.type === "general")
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
  const surgeThreshold = 85
  void patients // used for future derived stats
  return {
    totalBeds,
    availableBeds,
    occupiedBeds,
    icuBeds: { total: icuBeds.length, available: icuBeds.filter((b) => b.status === "available").length },
    emergencyBeds: { total: emergencyBeds.length, available: emergencyBeds.filter((b) => b.status === "available").length },
    generalBeds: { total: generalBeds.length, available: generalBeds.filter((b) => b.status === "available").length },
    occupancyRate,
    surgeMode: occupancyRate >= surgeThreshold,
    surgeThreshold,
  }
}

// ── Hooks ──────────────────────────────────────────────────────────

export function usePatients(): Patient[] {
  const [patients, setPatients] = useState<Patient[]>([])
  const channelId = useRef(uid("patients-watch"))

  useEffect(() => {
    const load = () =>
      supabase
        .from("patients")
        .select("*")
        .order("created_at")
        .then(({ data }) => { if (data) setPatients(data.map(mapPatient)) })

    load()

    const channel = supabase
      .channel(channelId.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return patients
}

export function useBeds(): Bed[] {
  const [beds, setBeds] = useState<Bed[]>([])
  const channelId = useRef(uid("beds-watch"))

  useEffect(() => {
    const load = () =>
      supabase
        .from("beds")
        .select("*")
        .order("number")
        .then(({ data }) => { if (data) setBeds(data.map(mapBed)) })

    load()

    const channel = supabase
      .channel(channelId.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "beds" }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return beds
}

export function useStats(): HospitalStats {
  const patients = usePatients()
  const beds = useBeds()
  return computeStats(patients, beds)
}

export function useQueue(): Patient[] {
  const [queue, setQueue] = useState<Patient[]>([])
  const channelId = useRef(uid("queue-watch"))

  useEffect(() => {
    const PRIORITY: Record<string, number> = { critical: 0, severe: 1, moderate: 2, mild: 3 }

    const load = async () => {
      const { data } = await supabase
        .from("patients")
        .select("*")
        .eq("status", "in-queue")

      if (!data) return

      const mapped = data.map(mapPatient)
      const now = Date.now()
      const threshold = SEVERE_ESCALATION_MINUTES * 60 * 1000

      // Auto-escalate severe patients that have breached the wait threshold
      const toEscalate = mapped.filter(
        (p) => p.verifiedPriority === "severe" && now - p.createdAt.getTime() >= threshold
      )
      if (toEscalate.length > 0) {
        await Promise.all(
          toEscalate.map((p) =>
            supabase
              .from("patients")
              .update({ verified_priority: "critical" })
              .eq("id", p.id)
          )
        )
        // Reload after escalations
        return load()
      }

      // ALL in-queue patients appear in the live token list.
      // Unverified critical patients appear at the top of the table with a "Needs Verification"
      // status and are also highlighted in the banner above — they are NOT excluded from the table.

      // Priority-weighted wait: critical patients are seen much faster.
      // Each queue slot costs: critical=3 min, severe=7 min, moderate=12 min, mild=15 min.
      // Critical is also capped at 15 min max — they are never made to wait long.
      const waitMins = (priority: string, pos: number): number => {
        if (priority === "critical") return Math.min(pos * 3, 15)
        if (priority === "severe")   return Math.min(pos * 7, 90)
        if (priority === "moderate") return pos * 12
        return pos * 15
      }

      // Sort: unverified critical first, then verified critical, then by priority+time
      const urgencyScore = (p: Patient): number => {
        if (p.verifiedPriority === "critical" && !p.nurseVerified) return -1 // top
        return PRIORITY[p.verifiedPriority] ?? 3
      }
      const sorted = mapped
        .sort((a, b) => {
          const d = urgencyScore(a) - urgencyScore(b)
          return d !== 0 ? d : a.createdAt.getTime() - b.createdAt.getTime()
        })
        .map((p, i) => ({
          ...p,
          queuePosition: i + 1,
          estimatedWaitTime: waitMins(p.verifiedPriority, i + 1),
        }))

      // Write queue_position + estimated_wait_time back to DB so
      // PatientStatus subscribers get realtime position updates
      await Promise.all(
        sorted.map((p) =>
          supabase
            .from("patients")
            .update({ queue_position: p.queuePosition, estimated_wait_time: p.estimatedWaitTime })
            .eq("id", p.id)
        )
      )

      setQueue(sorted)
    }

    load()

    // Re-check every 60 s so severe patients escalate even with no DB events
    const timer = setInterval(load, 60_000)

    const channel = supabase
      .channel(channelId.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, load)
      .subscribe()

    return () => { clearInterval(timer); supabase.removeChannel(channel) }
  }, [])

  return queue
}

export function useLogs(): ActivityLog[] {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const channelId = useRef(uid("logs-watch"))

  useEffect(() => {
    const load = () =>
      supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ data }) => { if (data) setLogs(data.map((r: any) => ({
          id: r.id,
          action: r.action,
          details: r.details ?? "",
          timestamp: new Date(r.created_at),
          actor: r.actor,
        }))) })

    load()

    const channel = supabase
      .channel(channelId.current)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return logs
}

export function usePatientById(id: string): Patient | null {
  const [patient, setPatient] = useState<Patient | null>(null)

  useEffect(() => {
    if (!id) return
    supabase.from("patients").select("*").eq("id", id).single()
      .then(({ data }) => { if (data) setPatient(mapPatient(data)) })
  }, [id])

  return patient
}

export function usePatientByToken(token: number): Patient | null {
  const [patient, setPatient] = useState<Patient | null>(null)

  useEffect(() => {
    if (!token) return

    const PRIORITY: Record<string, number> = { critical: 0, severe: 1, moderate: 2, mild: 3 }

    const load = async () => {
      // Fetch this patient
      const { data: row } = await supabase
        .from("patients")
        .select("*")
        .eq("token_number", token)
        .single()
      if (!row) return

      const thisPatient = mapPatient(row)

      // Compute live queue position only if in-queue
      if (thisPatient.status === "in-queue") {
        const { data: allQueue } = await supabase
          .from("patients")
          .select("id, verified_priority, created_at")
          .eq("status", "in-queue")

        if (allQueue) {
          const sorted = allQueue.sort((a, b) => {
            const d = (PRIORITY[a.verified_priority] ?? 3) - (PRIORITY[b.verified_priority] ?? 3)
            return d !== 0 ? d : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })
          const pos = sorted.findIndex((r) => r.id === thisPatient.id) + 1
          thisPatient.queuePosition = pos > 0 ? pos : thisPatient.queuePosition
          const p = thisPatient.verifiedPriority
          const qp = thisPatient.queuePosition
          thisPatient.estimatedWaitTime =
            p === "critical" ? Math.min(qp * 3, 15) :
            p === "severe"   ? Math.min(qp * 7, 90) :
            p === "moderate" ? qp * 12 : qp * 15
        }
      }

      setPatient(thisPatient)
    }

    load()

    // Subscribe to any change in patients table → recompute position
    const channel = supabase
      .channel(`patient-token-${token}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [token])

  return patient
}

// ── Patients awaiting nurse verification (critical + unverified) ──────────────
export function usePendingCritical(): Patient[] {
  const [pending, setPending] = useState<Patient[]>([])
  const channelId = useRef(uid("pending-critical-watch"))

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("patients")
        .select("*")
        .eq("status", "in-queue")
        .eq("verified_priority", "critical")
        .eq("nurse_verified", false)
        .order("created_at", { ascending: true })
      setPending(data ? data.map(mapPatient) : [])
    }

    load()
    const channel = supabase
      .channel(channelId.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return pending
}
