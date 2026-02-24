// ── Supabase Hospital Store ──────────────────────────────────────────────────
// All actions are async and write to Supabase directly.
// Real-time state is consumed via hooks/use-hospital.ts using Supabase realtime.

import { supabase } from "./supabase"
import type { Priority, BedStatus, WardType, Patient } from "./types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

async function addLog(action: string, details: string, actor: string): Promise<void> {
  await supabase.from("activity_logs").insert({ action, details, actor })
}

async function getNextToken(): Promise<number> {
  const { data } = await supabase
    .from("patients")
    .select("token_number")
    .order("token_number", { ascending: false })
    .limit(1)
    .single()
  return (data?.token_number ?? 100) + 1
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function registerPatient(data: {
  name: string
  age: number
  symptoms: string
  selfAssessedSeverity: Priority
  wardType: WardType
}): Promise<Patient> {
  const tokenNumber = await getNextToken()

  // Critical patients are inserted with status "in-queue" (satisfies DB constraint)
  // but nurse_verified = false acts as the "pending verification" gate.
  // The queue hook excludes unverified critical patients from numbered positions
  // until a nurse verifies them, at which point they jump to position 1.
  const { data: row, error } = await supabase
    .from("patients")
    .insert({
      name: data.name,
      age: data.age,
      symptoms: data.symptoms,
      self_assessed_severity: data.selfAssessedSeverity,
      verified_priority: data.selfAssessedSeverity,
      ward_type: data.wardType,
      status: "in-queue",
      token_number: tokenNumber,
      queue_position: 0,
      estimated_wait_time: 0,
      nurse_verified: false,
      admission_requested: false,
    })
    .select()
    .single()

  if (error || !row) throw new Error(error?.message ?? "Registration failed")

  const isCritical = data.selfAssessedSeverity === "critical"
  const logMsg = isCritical
    ? `${data.name} (Token #${tokenNumber}) registered as CRITICAL — awaiting nurse verification`
    : `${data.name} (Token #${tokenNumber}) registered`
  await addLog("Patient Registered", logMsg, "System")
  return mapPatient(row)
}

export async function verifyPatient(patientId: string): Promise<void> {
  const { data: patient } = await supabase
    .from("patients")
    .select("name, status")
    .eq("id", patientId)
    .single()

  // Mark as nurse-verified. The queue hook will now include this patient
  // and sort them to position 1 (critical = highest priority).
  // Also flag admission_requested so Admin sees a bed-allocation alert immediately.
  await supabase
    .from("patients")
    .update({ nurse_verified: true, queue_position: 0, estimated_wait_time: 0, admission_requested: true })
    .eq("id", patientId)

  if (patient)
    await addLog(
      "Bed Request",
      `CRITICAL: ${patient.name} verified by nurse — bed assignment needed immediately`,
      "Nurse"
    )
}

export async function updatePriority(patientId: string, newPriority: Priority): Promise<void> {
  const { data: patient } = await supabase
    .from("patients")
    .select("name, verified_priority")
    .eq("id", patientId)
    .single()

  await supabase
    .from("patients")
    .update({ verified_priority: newPriority })
    .eq("id", patientId)

  if (patient)
    await addLog(
      "Priority Updated",
      `${patient.name}: ${patient.verified_priority} -> ${newPriority}`,
      "Reception"
    )
}

export async function requestAdmission(patientId: string): Promise<void> {
  const { data: patient } = await supabase
    .from("patients")
    .select("name")
    .eq("id", patientId)
    .single()

  await supabase
    .from("patients")
    .update({ admission_requested: true })
    .eq("id", patientId)

  if (patient)
    await addLog("Admission Requested", `Admission requested for ${patient.name}`, "Doctor")
}

export async function admitPatient(patientId: string, bedId: string): Promise<void> {
  const { data: patient } = await supabase
    .from("patients")
    .select("name")
    .eq("id", patientId)
    .single()

  const { data: bed } = await supabase
    .from("beds")
    .select("number, status")
    .eq("id", bedId)
    .single()

  if (!bed || bed.status !== "available") return

  await supabase.from("patients").update({
    status: "admitted",
    bed_id: bedId,
    queue_position: 0,
    estimated_wait_time: 0,
  }).eq("id", patientId)

  await supabase.from("beds").update({
    status: "occupied",
    patient_id: patientId,
  }).eq("id", bedId)

  if (patient && bed)
    await addLog("Patient Admitted", `${patient.name} admitted to bed ${bed.number}`, "Reception")
}

export async function dischargePatient(patientId: string): Promise<void> {
  const { data: patient } = await supabase
    .from("patients")
    .select("name, bed_id")
    .eq("id", patientId)
    .single()

  if (!patient) return

  await supabase.from("patients").update({ status: "discharged", bed_id: null }).eq("id", patientId)

  if (patient.bed_id) {
    await supabase.from("beds").update({ status: "cleaning", patient_id: null }).eq("id", patient.bed_id)
  }

  await addLog("Patient Discharged", `${patient.name} discharged`, "Reception")
}

export async function updateBedStatus(bedId: string, status: BedStatus): Promise<void> {
  const { data: bed } = await supabase
    .from("beds")
    .select("number, status, patient_id")
    .eq("id", bedId)
    .single()

  if (!bed) return

  await supabase.from("beds").update({ status, patient_id: status === "occupied" ? bed.patient_id : null }).eq("id", bedId)

  // If moving a bed away from "occupied", discharge the patient occupying it
  if (bed.status === "occupied" && status !== "occupied" && bed.patient_id) {
    await supabase.from("patients").update({ status: "discharged", bed_id: null }).eq("id", bed.patient_id)
  }

  if (bed) await addLog("Bed Status Updated", `Bed ${bed.number} → ${status}`, "Reception")
}

export async function emergencyOverride(patientId: string): Promise<void> {
  const { data: patient } = await supabase
    .from("patients")
    .select("name")
    .eq("id", patientId)
    .single()

  await supabase
    .from("patients")
    .update({ verified_priority: "critical" })
    .eq("id", patientId)

  if (patient)
    await addLog("Emergency Override", `${patient.name} escalated to CRITICAL`, "Doctor")
}
