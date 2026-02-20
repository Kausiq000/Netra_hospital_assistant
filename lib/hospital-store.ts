import type { Patient, Bed, Priority, BedStatus, BedType, WardType, PatientStatus, ActivityLog } from "./types"

// --- Deterministic ID/token generators for seed data ---
let seedIdCounter = 0
function seedId(): string {
  seedIdCounter++
  return `seed-${seedIdCounter}`
}

let tokenCounter = 100

function generateToken(): number {
  tokenCounter += 1
  return tokenCounter
}

function generateId(): string {
  return `rt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// --- Seed Data (deterministic - no Math.random or Date.now at module level) ---
const initialBeds: Bed[] = [
  // General beds (Floor 1)
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `bed-g-${i + 1}`,
    number: `G-${String(i + 1).padStart(3, "0")}`,
    type: "general" as BedType,
    status: (i < 12 ? "occupied" : i < 14 ? "cleaning" : "available") as BedStatus,
    patientId: null as string | null,
    floor: 1,
  })),
  // Emergency beds (Floor 2)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `bed-e-${i + 1}`,
    number: `E-${String(i + 1).padStart(3, "0")}`,
    type: "emergency" as BedType,
    status: (i < 6 ? "occupied" : i < 7 ? "maintenance" : "available") as BedStatus,
    patientId: null as string | null,
    floor: 2,
  })),
  // ICU beds (Floor 3)
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `bed-i-${i + 1}`,
    number: `ICU-${String(i + 1).padStart(3, "0")}`,
    type: "icu" as BedType,
    status: (i < 5 ? "occupied" : i < 6 ? "cleaning" : "available") as BedStatus,
    patientId: null as string | null,
    floor: 3,
  })),
]

const sampleNames = [
  "Aarav Sharma", "Priya Patel", "Rahul Kumar", "Ananya Singh", "Vikram Reddy",
  "Sneha Gupta", "Arjun Nair", "Meera Joshi", "Karan Malhotra", "Diya Choudhury",
  "Rohan Pillai", "Ishita Verma",
]

const sampleSymptoms = [
  "Fever, headache, body ache",
  "Chest pain, shortness of breath",
  "Abdominal pain, nausea",
  "Fracture, swelling in left arm",
  "High fever, cough, difficulty breathing",
  "Severe headache, blurred vision",
  "Allergic reaction, skin rash",
  "Dizziness, fainting spells",
  "Back pain, numbness in legs",
  "Burn injuries on hand",
]

const sampleAges = [32, 45, 28, 56, 41, 33, 27, 62, 38, 50, 29, 44]

const priorities: Priority[] = ["mild", "moderate", "severe", "critical"]

// Use a fixed base timestamp for deterministic seed data
const BASE_TIME = new Date("2026-02-21T10:00:00Z")

const initialPatients: Patient[] = sampleNames.map((name, i) => {
  const priority = priorities[i % 4]
  const wardType: WardType = i < 6 ? "general" : "emergency"
  const status: PatientStatus = i < 8 ? "in-queue" : "admitted"
  const token = generateToken()
  return {
    id: seedId(),
    name,
    age: sampleAges[i],
    symptoms: sampleSymptoms[i % sampleSymptoms.length],
    selfAssessedSeverity: priority,
    verifiedPriority: priority,
    wardType,
    status,
    tokenNumber: token,
    queuePosition: i < 8 ? i + 1 : 0,
    estimatedWaitTime: i < 8 ? (i + 1) * 8 : 0,
    bedId: null,
    createdAt: new Date(BASE_TIME.getTime() - (12 - i) * 900000),
    nurseVerified: i < 10,
    admissionRequested: i >= 6 && i < 10,
  }
})

// Assign patients to occupied beds
let occupiedBedIdx = 0
initialPatients.forEach(p => {
  if (p.status === "admitted") {
    const occupiedBeds = initialBeds.filter(b => b.status === "occupied" && !b.patientId)
    if (occupiedBedIdx < occupiedBeds.length) {
      p.bedId = occupiedBeds[occupiedBedIdx].id
      occupiedBeds[occupiedBedIdx].patientId = p.id
      occupiedBedIdx++
    }
  }
})

const initialLogs: ActivityLog[] = [
  { id: seedId(), action: "Patient Registered", details: "Aarav Sharma registered via QR scan", timestamp: new Date(BASE_TIME.getTime() - 3600000 * 3), actor: "System" },
  { id: seedId(), action: "Priority Updated", details: "Priya Patel priority changed to Severe", timestamp: new Date(BASE_TIME.getTime() - 3600000 * 2), actor: "Dr. Mehta" },
  { id: seedId(), action: "Bed Assigned", details: "Bed G-009 assigned to Rahul Kumar", timestamp: new Date(BASE_TIME.getTime() - 3600000), actor: "Reception" },
  { id: seedId(), action: "Patient Discharged", details: "Patient in ICU-003 discharged", timestamp: new Date(BASE_TIME.getTime() - 1800000), actor: "Dr. Singh" },
  { id: seedId(), action: "Surge Alert", details: "Occupancy exceeded 85% threshold", timestamp: new Date(BASE_TIME.getTime() - 900000), actor: "System" },
]

// --- Store ---
let patients = [...initialPatients]
let beds = [...initialBeds]
let logs = [...initialLogs]
const surgeThreshold = 85

// --- Version counter for cache invalidation ---
let version = 0

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  version++
  // Invalidate all cached snapshots
  cachedPatients = null
  cachedBeds = null
  cachedStats = null
  cachedQueue = null
  cachedLogs = null
  listeners.forEach(l => l())
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// --- Cached snapshot approach ---
// Each getter returns the same reference until notify() is called

let cachedPatients: Patient[] | null = null
export function getPatients(): Patient[] {
  if (!cachedPatients) {
    cachedPatients = [...patients]
  }
  return cachedPatients
}

let cachedBeds: Bed[] | null = null
export function getBeds(): Bed[] {
  if (!cachedBeds) {
    cachedBeds = [...beds]
  }
  return cachedBeds
}

let cachedLogs: ActivityLog[] | null = null
export function getLogs(): ActivityLog[] {
  if (!cachedLogs) {
    cachedLogs = [...logs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
  return cachedLogs
}

export function getPatientById(id: string): Patient | undefined {
  return patients.find(p => p.id === id)
}

export function getPatientByToken(token: number): Patient | undefined {
  return patients.find(p => p.tokenNumber === token)
}

export type HospitalStats = {
  totalBeds: number
  availableBeds: number
  occupiedBeds: number
  icuBeds: { total: number; available: number }
  emergencyBeds: { total: number; available: number }
  generalBeds: { total: number; available: number }
  occupancyRate: number
  surgeMode: boolean
  surgeThreshold: number
}

let cachedStats: HospitalStats | null = null
export function getStats(): HospitalStats {
  if (!cachedStats) {
    const totalBeds = beds.length
    const availableBeds = beds.filter(b => b.status === "available").length
    const occupiedBeds = beds.filter(b => b.status === "occupied").length
    const icuTotal = beds.filter(b => b.type === "icu")
    const emergencyTotal = beds.filter(b => b.type === "emergency")
    const generalTotal = beds.filter(b => b.type === "general")
    const occupancyRate = Math.round((occupiedBeds / totalBeds) * 100)

    cachedStats = {
      totalBeds,
      availableBeds,
      occupiedBeds,
      icuBeds: { total: icuTotal.length, available: icuTotal.filter(b => b.status === "available").length },
      emergencyBeds: { total: emergencyTotal.length, available: emergencyTotal.filter(b => b.status === "available").length },
      generalBeds: { total: generalTotal.length, available: generalTotal.filter(b => b.status === "available").length },
      occupancyRate,
      surgeMode: occupancyRate >= surgeThreshold,
      surgeThreshold,
    }
  }
  return cachedStats
}

let cachedQueue: Patient[] | null = null
export function getQueue(): Patient[] {
  if (!cachedQueue) {
    cachedQueue = patients
      .filter(p => p.status === "in-queue")
      .sort((a, b) => {
        const priorityOrder: Record<Priority, number> = { critical: 0, severe: 1, moderate: 2, mild: 3 }
        const diff = priorityOrder[a.verifiedPriority] - priorityOrder[b.verifiedPriority]
        if (diff !== 0) return diff
        return a.createdAt.getTime() - b.createdAt.getTime()
      })
  }
  return cachedQueue
}

function recalculateQueue() {
  // Force queue recalculation
  cachedQueue = null
  const queue = getQueue()
  queue.forEach((p, i) => {
    const patient = patients.find(pt => pt.id === p.id)
    if (patient) {
      patient.queuePosition = i + 1
      patient.estimatedWaitTime = (i + 1) * 8
    }
  })
  // Reset again since we modified patients
  cachedQueue = null
}

export function registerPatient(data: {
  name: string
  age: number
  symptoms: string
  selfAssessedSeverity: Priority
  wardType: WardType
}): Patient {
  const patient: Patient = {
    id: generateId(),
    ...data,
    verifiedPriority: data.selfAssessedSeverity,
    status: "in-queue",
    tokenNumber: generateToken(),
    queuePosition: 0,
    estimatedWaitTime: 0,
    bedId: null,
    createdAt: new Date(),
    nurseVerified: false,
    admissionRequested: false,
  }
  patients.push(patient)
  recalculateQueue()
  addLog("Patient Registered", `${patient.name} (Token #${patient.tokenNumber}) registered`, "System")
  notify()
  return patient
}

export function verifyPatient(patientId: string): void {
  const patient = patients.find(p => p.id === patientId)
  if (patient) {
    patient.nurseVerified = true
    addLog("Patient Verified", `${patient.name} verified by nurse`, "Nurse")
    notify()
  }
}

export function updatePriority(patientId: string, newPriority: Priority): void {
  const patient = patients.find(p => p.id === patientId)
  if (patient) {
    const oldPriority = patient.verifiedPriority
    patient.verifiedPriority = newPriority
    recalculateQueue()
    addLog("Priority Updated", `${patient.name}: ${oldPriority} -> ${newPriority}`, "Reception")
    notify()
  }
}

export function requestAdmission(patientId: string): void {
  const patient = patients.find(p => p.id === patientId)
  if (patient) {
    patient.admissionRequested = true
    addLog("Admission Requested", `Admission requested for ${patient.name}`, "Doctor")
    notify()
  }
}

export function admitPatient(patientId: string, bedId: string): void {
  const patient = patients.find(p => p.id === patientId)
  const bed = beds.find(b => b.id === bedId)
  if (patient && bed && bed.status === "available") {
    patient.status = "admitted"
    patient.bedId = bedId
    patient.queuePosition = 0
    patient.estimatedWaitTime = 0
    bed.status = "occupied"
    bed.patientId = patientId
    recalculateQueue()
    addLog("Patient Admitted", `${patient.name} admitted to bed ${bed.number}`, "Reception")
    notify()
  }
}

export function dischargePatient(patientId: string): void {
  const patient = patients.find(p => p.id === patientId)
  if (patient) {
    if (patient.bedId) {
      const bed = beds.find(b => b.id === patient.bedId)
      if (bed) {
        bed.status = "cleaning"
        bed.patientId = null
      }
    }
    patient.status = "discharged"
    patient.bedId = null
    recalculateQueue()
    addLog("Patient Discharged", `${patient.name} discharged`, "Reception")
    notify()
  }
}

export function updateBedStatus(bedId: string, status: BedStatus): void {
  const bed = beds.find(b => b.id === bedId)
  if (bed) {
    if (bed.status === "occupied" && status !== "occupied") {
      const patient = patients.find(p => p.bedId === bedId)
      if (patient) {
        patient.status = "discharged"
        patient.bedId = null
      }
    }
    bed.status = status
    if (status !== "occupied") {
      bed.patientId = null
    }
    addLog("Bed Status Updated", `Bed ${bed.number}: ${status}`, "Reception")
    notify()
  }
}

export function emergencyOverride(patientId: string): void {
  const patient = patients.find(p => p.id === patientId)
  if (patient) {
    patient.verifiedPriority = "critical"
    recalculateQueue()
    addLog("Emergency Override", `${patient.name} escalated to CRITICAL`, "Doctor")
    notify()
  }
}

function addLog(action: string, details: string, actor: string) {
  logs.push({
    id: generateId(),
    action,
    details,
    timestamp: new Date(),
    actor,
  })
}
