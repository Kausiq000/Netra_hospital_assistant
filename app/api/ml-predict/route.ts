import { NextRequest, NextResponse } from "next/server"

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8000"

export interface TriageInput {
  sys_bp_mmHg: number
  dia_bp_mmHg: number
  heart_rate_bpm: number
  spo2_percentage: number
  respiratory_rate_bpm: number
  body_temp_celsius: number
  gcs_score: number
  blood_glucose_mgdL: number
  patient_age_years: number
  comorbidity_count: number
  chronic_respiratory_history_binary: number
  cardiac_history_binary: number
  immunosuppression_status_binary: number
  pregnancy_status_binary: number
  reported_pain_intensity_scale: number
  symptom_onset_duration_mins: number
  labored_breathing_binary: number
  mobility_assistance_level: number
  verbal_coherence_binary: number
  current_er_occupancy_percentage: number
  active_surge_protocol_binary: number
  nearby_clinic_availability_percentage: number
  travel_time_to_alt_facility_mins: number
}

export interface TriageOutput {
  priority: number             // urgency score 0–10
  los: number                  // predicted length-of-stay in days
  overflow_alert: boolean      // true when overflow_probability > 0.8
  overflow_probability: number // raw 0.0–1.0 for heatmap
  risk_level: "low" | "medium" | "high" | "critical"
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as TriageInput

    const res = await fetch(`${ML_SERVICE_URL}/predict_all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const data = await res.json() as TriageOutput
    return NextResponse.json(data)
  } catch (err) {
    console.error("ML triage error:", err)
    return NextResponse.json({ error: "ML service unavailable" }, { status: 503 })
  }
}
