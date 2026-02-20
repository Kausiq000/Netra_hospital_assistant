export type Priority = "mild" | "moderate" | "severe" | "critical"
export type WardType = "general" | "emergency"
export type BedStatus = "available" | "occupied" | "cleaning" | "maintenance"
export type BedType = "general" | "emergency" | "icu"
export type PatientStatus = "waiting" | "in-queue" | "admitted" | "discharged"

export interface Patient {
  id: string
  name: string
  age: number
  symptoms: string
  selfAssessedSeverity: Priority
  verifiedPriority: Priority
  wardType: WardType
  status: PatientStatus
  tokenNumber: number
  queuePosition: number
  estimatedWaitTime: number
  bedId: string | null
  createdAt: Date
  nurseVerified: boolean
  admissionRequested: boolean
}

export interface Bed {
  id: string
  number: string
  type: BedType
  status: BedStatus
  patientId: string | null
  floor: number
}

export interface HospitalStats {
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

export interface ActivityLog {
  id: string
  action: string
  details: string
  timestamp: Date
  actor: string
}
