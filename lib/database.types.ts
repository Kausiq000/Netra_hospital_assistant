/**
 * NETRA — Supabase Database Types
 *
 * Normally generated via: npx supabase gen types typescript --project-id YOUR_ID
 * Manually maintained here until CLI is set up.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          role: "patient" | "nurse" | "doctor" | "admin"
          phone: string | null
          username: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          role: "patient" | "nurse" | "doctor" | "admin"
          phone?: string | null
          username?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          role?: "patient" | "nurse" | "doctor" | "admin"
          phone?: string | null
          username?: string | null
        }
      }

      patients: {
        Row: {
          id: string
          user_id: string | null
          name: string
          age: number
          phone: string | null
          symptoms: string
          self_assessed_severity: "mild" | "moderate" | "severe" | "critical"
          verified_priority: "mild" | "moderate" | "severe" | "critical"
          ward_type: "general" | "emergency"
          status: "waiting" | "in-queue" | "admitted" | "discharged"
          token_number: number | null
          queue_position: number | null
          estimated_wait_time: number | null
          bed_id: string | null
          nurse_verified: boolean
          admission_requested: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          age: number
          phone?: string | null
          symptoms: string
          self_assessed_severity: "mild" | "moderate" | "severe" | "critical"
          verified_priority?: "mild" | "moderate" | "severe" | "critical"
          ward_type?: "general" | "emergency"
          status?: "waiting" | "in-queue" | "admitted" | "discharged"
          token_number?: number | null
          queue_position?: number | null
          estimated_wait_time?: number | null
          bed_id?: string | null
          nurse_verified?: boolean
          admission_requested?: boolean
        }
        Update: {
          verified_priority?: "mild" | "moderate" | "severe" | "critical"
          status?: "waiting" | "in-queue" | "admitted" | "discharged"
          bed_id?: string | null
          nurse_verified?: boolean
          admission_requested?: boolean
          queue_position?: number | null
          estimated_wait_time?: number | null
          updated_at?: string
        }
      }

      beds: {
        Row: {
          id: string
          number: string
          type: "general" | "emergency" | "icu"
          ward: "general" | "emergency" | "icu"
          status: "available" | "occupied" | "cleaning" | "maintenance"
          patient_id: string | null
          floor: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          number: string
          type: "general" | "emergency" | "icu"
          ward: "general" | "emergency" | "icu"
          status?: "available" | "occupied" | "cleaning" | "maintenance"
          patient_id?: string | null
          floor?: number
        }
        Update: {
          status?: "available" | "occupied" | "cleaning" | "maintenance"
          patient_id?: string | null
          updated_at?: string
        }
      }

      doctors: {
        Row: {
          id: string
          user_id: string | null
          name: string
          specialty: string
          registration_no: string | null
          status: "available" | "busy" | "in-surgery" | "on-leave"
          assigned_nurse_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          specialty: string
          registration_no?: string | null
          status?: "available" | "busy" | "in-surgery" | "on-leave"
          assigned_nurse_id?: string | null
        }
        Update: {
          status?: "available" | "busy" | "in-surgery" | "on-leave"
          assigned_nurse_id?: string | null
          updated_at?: string
        }
      }

      appointment_requests: {
        Row: {
          id: string
          patient_id: string | null
          patient_name: string
          doctor_id: string | null
          doctor_name: string
          specialty: string
          slot: string
          status: "pending" | "approved" | "rejected"
          reviewed_by: string | null
          reviewed_at: string | null
          notes: string | null
          requested_at: string
          created_at: string
        }
        Insert: {
          id?: string
          patient_id?: string | null
          patient_name: string
          doctor_id?: string | null
          doctor_name: string
          specialty: string
          slot: string
          status?: "pending" | "approved" | "rejected"
          notes?: string | null
        }
        Update: {
          status?: "pending" | "approved" | "rejected"
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
        }
      }

      surgery_alerts: {
        Row: {
          id: string
          doctor_id: string | null
          doctor_name: string
          duration: string
          active: boolean
          started_at: string
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          doctor_id?: string | null
          doctor_name: string
          duration: string
          active?: boolean
          started_at?: string
        }
        Update: {
          active?: boolean
          ended_at?: string | null
        }
      }

      surgery_affected_appointments: {
        Row: {
          id: string
          surgery_alert_id: string
          patient_name: string
          original_time: string
          concern: string
          rescheduled_to: string | null
          rescheduled_by: string | null
          rescheduled_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          surgery_alert_id: string
          patient_name: string
          original_time: string
          concern: string
          rescheduled_to?: string | null
          rescheduled_by?: string | null
        }
        Update: {
          rescheduled_to?: string | null
          rescheduled_by?: string | null
          rescheduled_at?: string | null
        }
      }

      emergency_alerts: {
        Row: {
          id: string
          message: string
          triggered_by: string | null
          active: boolean
          triggered_at: string
          dismissed_at: string | null
          dismissed_by: string | null
        }
        Insert: {
          id?: string
          message: string
          triggered_by?: string | null
          active?: boolean
        }
        Update: {
          active?: boolean
          dismissed_at?: string | null
          dismissed_by?: string | null
        }
      }

      activity_logs: {
        Row: {
          id: string
          action: string
          details: string | null
          actor: string
          actor_id: string | null
          patient_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          action: string
          details?: string | null
          actor?: string
          actor_id?: string | null
          patient_id?: string | null
        }
        Update: Record<string, never>
      }
    }

    Views: {
      queue_view: {
        Row: {
          id: string
          name: string
          age: number
          symptoms: string
          verified_priority: "mild" | "moderate" | "severe" | "critical"
          ward_type: "general" | "emergency"
          status: string
          token_number: number | null
          estimated_wait_time: number | null
          nurse_verified: boolean
          admission_requested: boolean
          created_at: string
          queue_position: number
        }
      }
    }

    Functions: {
      current_user_role: {
        Args: Record<string, never>
        Returns: string
      }
    }
  }
}
