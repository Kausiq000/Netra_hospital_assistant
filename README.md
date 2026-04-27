# 👁️ NETRA Hospital Assistant

<p align="center">
  <b>AI-Powered Smart Hospital Operations, Triage & Resource Management Platform</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-App_Router-111827?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-2563EB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Realtime-16A34A?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-ML_Service-06B6D4?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Status-Production_Prototype-9333EA?style=for-the-badge" />
</p>

---

## 🏥 Vision

NETRA is an intelligent hospital assistant platform that digitizes the complete patient lifecycle:

```txt id="3f2wke"
Arrival → AI Triage → Queue Management → Bed Allocation
→ Doctor Workflow → Emergency Handling → Resource Forecasting
```

Designed to reduce wait times, optimize hospital resources, and improve patient experience.

---

## 🚀 Core Modules

## 🧍 Patient Kiosk Portal

Self-service check-in for incoming patients.

Features:

* Symptom & patient detail intake
* Smart queue registration
* AI-assisted severity estimation
* Faster onboarding with reduced manual load

---

## 🩺 Nurse & Reception Portal

Operational dashboard for triage teams.

Features:

* Live queue visibility
* Priority verification
* Route patient to doctor / admission
* Emergency notifications
* Real-time updates via Supabase Realtime

---

## 🛏️ Bed & Admin Dashboard

Resource command center for hospital staff.

Features:

* Ward-wise bed management
* ICU / Emergency / General tracking
* Overflow prediction support
* Smart admission workflows

---

## 👨‍⚕️ Doctor Portal

Dedicated workflow system for doctors.

Features:

* Review appointment requests
* Approve / reject schedules
* Surgery mode alerts
* Auto-detect impacted appointments
* Rescheduling coordination

---

## 🤖 AI / ML Intelligence Layer

Powered by FastAPI microservice + trained models.

Predictions include:

* Patient Length of Stay (LOS)
* Required ward type
* Overflow probability
* Resource planning signals

Models powered by:

```txt id="i3ehq6"
Scikit-learn
XGBoost
Pandas
NumPy
```

---

## 🏗️ Architecture

```txt id="8zz8xa"
Frontend (Next.js + React + TypeScript)
        ↓
Supabase Backend
(Database + Auth + Realtime + RLS)
        ↓
FastAPI ML Microservice
(LOS / Overflow / Ward Prediction)
```

---

## 🛠️ Tech Stack

| Layer        | Technology                        |
| ------------ | --------------------------------- |
| Frontend     | Next.js 16, React 19, TypeScript  |
| UI           | Tailwind CSS, shadcn/ui, Radix UI |
| Forms        | React Hook Form, Zod              |
| Charts       | Recharts                          |
| Backend      | Supabase                          |
| Database     | PostgreSQL                        |
| Auth         | Supabase Auth                     |
| Realtime     | Supabase Subscriptions            |
| ML Service   | Python FastAPI                    |
| ML Libraries | XGBoost, Scikit-learn             |

---

## 🔐 Security & Access Control

Role-based access powered by Supabase Auth:

```txt id="gjttvq"
Admin
Doctor
Nurse
Patient
```

Protected using:

* Row Level Security (RLS)
* Scoped access rules
* Audit activity logs

---

## 📊 Why This Project Stands Out

NETRA combines multiple engineering domains:

* Full Stack Product Engineering
* AI / ML Deployment
* Real-time Systems
* Healthcare Workflow Design
* Database Architecture
* Role-based Security Systems

---

## ⚙️ Run Locally

```bash id="myl0ke"
npm install
npm run dev
```

ML Service:

```bash id="r6zt8m"
cd ml-service
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 🌍 Real-World Impact

Ideal for:

* Hospitals
* Clinics
* Smart emergency centers
* Queue-heavy healthcare systems
* Capacity planning environments

---

## 🔮 Future Enhancements

* Voice-enabled kiosk assistant
* Multi-hospital analytics dashboard
* Predictive emergency surge planning
* Mobile patient companion app
* Computer vision triage intake
