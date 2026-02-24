"""
NETRA ML Microservice — Three-Model Sequential Pipeline
-------------------------------------------------------
Models:
  1. netra_multi_output_model.pkl  →  urgency_score  (+ other triage outputs)
  2. netra_los_model.pkl           →  predicted_los   (uses urgency + vitals)
  3. netra_overflow_model_v1.pkl   →  overflow_probability (uses LOS + capacity)

Usage:
  pip install -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Endpoint:
  POST /triage   →  { urgency_score, predicted_los, overflow_probability }
  GET  /health   →  model load status
"""

import os
import traceback
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="NETRA ML Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-production-domain.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model paths (all .pkl files must be placed in this ml-service/ folder) ───
BASE_DIR = os.path.dirname(__file__)

def load_model(filename: str):
    path = os.path.join(BASE_DIR, filename)
    try:
        m = joblib.load(path)
        print(f"✅  Loaded: {filename}")
        return m
    except FileNotFoundError:
        print(f"⚠️   Not found: {filename}  —  place it in ml-service/")
        return None
    except Exception as exc:
        print(f"❌  Error loading {filename}: {exc}")
        return None

# Load all three models at startup
multi_model    = load_model("netra_multi_output_model.pkl")   # Step 1: urgency
los_model      = load_model("netra_los_model.pkl")             # Step 2: LOS
overflow_model = load_model("netra_overflow_model_v1.pkl")     # Step 3: overflow


# ─────────────────────────────────────────────────────────────────────────────
# Input schema — 23 features
# ─────────────────────────────────────────────────────────────────────────────
class TriageRequest(BaseModel):
    # ── Vitals ────────────────────────────────────────────────────────────────
    sys_bp_mmHg:                        float = Field(..., example=120.0)
    dia_bp_mmHg:                        float = Field(..., example=80.0)
    heart_rate_bpm:                     float = Field(..., example=72.0)
    spo2_percentage:                    float = Field(..., example=98.0)
    respiratory_rate_bpm:               float = Field(..., example=16.0)
    body_temp_celsius:                  float = Field(..., example=37.0)
    gcs_score:                          float = Field(..., example=15.0)
    blood_glucose_mgdL:                 float = Field(..., example=90.0)

    # ── Patient profile ───────────────────────────────────────────────────────
    patient_age_years:                  float = Field(..., example=45.0)
    comorbidity_count:                  float = Field(..., example=1.0)
    chronic_respiratory_history_binary: float = Field(..., example=0.0)
    cardiac_history_binary:             float = Field(..., example=0.0)
    immunosuppression_status_binary:    float = Field(..., example=0.0)
    pregnancy_status_binary:            float = Field(..., example=0.0)

    # ── Presenting condition ──────────────────────────────────────────────────
    reported_pain_intensity_scale:      float = Field(..., example=5.0)
    symptom_onset_duration_mins:        float = Field(..., example=60.0)
    labored_breathing_binary:           float = Field(..., example=0.0)
    mobility_assistance_level:          float = Field(..., example=0.0)
    verbal_coherence_binary:            float = Field(..., example=1.0)

    # ── Capacity / environment ────────────────────────────────────────────────
    current_er_occupancy_percentage:    float = Field(..., example=60.0)
    active_surge_protocol_binary:       float = Field(..., example=0.0)
    nearby_clinic_availability_percentage: float = Field(..., example=70.0)
    travel_time_to_alt_facility_mins:   float = Field(..., example=15.0)


# ── Output schema ─────────────────────────────────────────────────────────────
class PredictAllResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())   # suppress "model_" warning

    priority:        float   # urgency score 0–10 from multi-output model
    los:             float   # predicted length-of-stay in days
    overflow_alert:  bool    # True when overflow probability > 0.8
    overflow_probability: float  # raw probability for frontend heatmap
    risk_level:      str    # "low" | "medium" | "high" | "critical"


def risk_label(overflow_prob: float, urgency: float) -> str:
    if overflow_prob >= 0.75 or urgency >= 8.5:
        return "critical"
    if overflow_prob >= 0.5 or urgency >= 6.5:
        return "high"
    if overflow_prob >= 0.25 or urgency >= 4.0:
        return "medium"
    return "low"


# ─────────────────────────────────────────────────────────────────────────────
# POST /predict_all — sequential three-model pipeline
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/predict_all", response_model=PredictAllResponse)
async def predict_all(data: TriageRequest):
    if not all([multi_model, los_model, overflow_model]):
        missing = [
            name for name, m in [
                ("netra_multi_output_model", multi_model),
                ("netra_los_model", los_model),
                ("netra_overflow_model_v1", overflow_model),
            ] if m is None
        ]
        raise HTTPException(
            status_code=503,
            detail=f"Models not loaded: {missing}. Place all .pkl files in ml-service/"
        )

    try:
        # Build full 23-feature DataFrame (column names match training)
        df = pd.DataFrame([data.dict()])

        # ── Step 1: Urgency Score ─────────────────────────────────────────────
        # MultiOutputRegressor → 4 outputs (confirmed from model feature_names):
        #   [0] raw_urgency_score_0_10
        #   [1] admission_probability_percentage
        #   [2] deterioration_risk_percentage
        #   [3] resource_intensity_forecast_0_1
        step1_out = np.atleast_1d(multi_model.predict(df)[0]).astype(float)
        urgency                    = float(step1_out[0])
        admission_probability      = float(step1_out[1]) if len(step1_out) > 1 else 0.0
        deterioration_risk         = float(step1_out[2]) if len(step1_out) > 2 else 0.0
        resource_intensity         = float(step1_out[3]) if len(step1_out) > 3 else 0.0

        # ── Step 2: Length of Stay ────────────────────────────────────────────
        # Exact 9 features the LOS model (XGBoost) was trained on
        # (confirmed from feature_names mismatch):
        los_input = pd.DataFrame([{
            "raw_urgency_score_0_10":           urgency,
            "admission_probability_percentage":  admission_probability,
            "deterioration_risk_percentage":     deterioration_risk,
            "patient_age_years":                 data.patient_age_years,
            "comorbidity_count":                 data.comorbidity_count,
            "spo2_percentage":                   data.spo2_percentage,
            "respiratory_rate_bpm":              data.respiratory_rate_bpm,
            "current_er_occupancy_percentage":   data.current_er_occupancy_percentage,
            "active_surge_protocol_binary":      data.active_surge_protocol_binary,
        }])
        los_hours = float(np.atleast_1d(los_model.predict(los_input)[0])[0])

        # ── Step 3: Overflow Risk ─────────────────────────────────────────────
        # Exact 6 features the overflow model (XGBoost) was trained on
        # (confirmed from feature_names mismatch):
        #   current_er_occupancy_percentage, admission_probability_percentage,
        #   predicted_length_of_stay_hours, active_surge_protocol_binary,
        #   resource_intensity_forecast_0_1, deterioration_risk_percentage
        overflow_input = pd.DataFrame([{
            "current_er_occupancy_percentage":   data.current_er_occupancy_percentage,
            "admission_probability_percentage":  admission_probability,
            "predicted_length_of_stay_hours":    los_hours,
            "active_surge_protocol_binary":      data.active_surge_protocol_binary,
            "resource_intensity_forecast_0_1":   resource_intensity,
            "deterioration_risk_percentage":     deterioration_risk,
        }])
        overflow_risk = float(overflow_model.predict_proba(overflow_input)[:, 1][0])

        return PredictAllResponse(
            priority=round(urgency, 4),
            los=round(los_hours, 4),
            overflow_alert=overflow_risk > 0.8,
            overflow_probability=round(overflow_risk, 4),
            risk_level=risk_label(overflow_risk, urgency),
        )

    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Prediction pipeline failed. Check server logs.")


# ─────────────────────────────────────────────────────────────────────────────
# GET /health
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "endpoint": "POST /predict_all",
        "models": {
            "netra_multi_output_model": multi_model is not None,
            "netra_los_model":          los_model is not None,
            "netra_overflow_model_v1":  overflow_model is not None,
        },
    }
