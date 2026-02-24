"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { PriorityBadge } from "@/components/priority-badge"
import { useQueue, usePatients, useBeds } from "@/hooks/use-hospital"
import { requestAdmission, emergencyOverride, dischargePatient } from "@/lib/hospital-store"
import { triggerEmergencySurgery, deactivateSurgery as deactivateSharedSurgery, useEmergencyAlert, dismissEmergencyAlert } from "@/lib/appointment-store"
import { useAuth } from "@/hooks/use-auth"
import type { Priority } from "@/lib/types"
import {
  Stethoscope,
  Users,
  AlertTriangle,
  BedDouble,
  Clock,
  ShieldCheck,
  Zap,
  LogOut,
  Loader2,
  FileText,
  Syringe,
  HeartPulse,
  Timer,
  CalendarClock,
  UserCheck,
  TriangleAlert,
  Siren,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const priorityBorder: Record<Priority, string> = {
  critical: "border-l-red-500",
  severe:   "border-l-orange-500",
  moderate: "border-l-amber-500",
  mild:     "border-l-emerald-500",
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

/* ---------- Static doctor + nurse assignment ---------- */
const DOCTOR_PROFILE = {
  name: "Dr. Arjun Mehta",
  specialty: "Neurology",
  reg: "MCI-2018-05432",
}
const ASSISTANT_NURSE = {
  name: "Nurse Priya Suresh",
  badge: "NRS-042",
  phone: "+91 98765 00001",
}

/* ---------- Simulated affected appointments ---------- */
const AFFECTED_APPOINTMENTS = [
  { id: "a1", patientName: "Rahul Verma",   time: "11:00 AM", concern: "Follow-up MRI review" },
  { id: "a2", patientName: "Sunita Pillai",  time: "11:45 AM", concern: "Post-surgery consultation" },
  { id: "a3", patientName: "Mohan Das",      time: "12:30 PM", concern: "Neurological assessment" },
]

const DURATION_OPTIONS = ["2–3 hours", "3–4 hours", "4–5 hours"]
const RESCHEDULE_SLOTS  = ["3:00 PM today", "4:30 PM today", "Tomorrow 10:00 AM", "Tomorrow 2:00 PM"]

export default function DoctorPage() {
  const [mounted, setMounted]                   = useState(false)
  const [overrideTarget, setOverrideTarget]       = useState<string | null>(null)
  const [emergencySurgeryOpen, setEmergencySurgeryOpen] = useState(false)

  /* Surgery Mode state */
  const [surgeryMode, setSurgeryMode]       = useState(false)
  const [surgeryDuration, setSurgeryDuration] = useState("")
  const [rescheduleSlots, setRescheduleSlots] = useState<Record<string, string>>({})

  useEffect(() => { setMounted(true) }, [])

  const queue          = useQueue()
  const patients       = usePatients()
  const beds           = useBeds()
  const emergencyAlert = useEmergencyAlert()

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#F4FFF8" }}>
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  const admitted       = patients.filter((p) => p.status === "admitted")
  const criticalCount  = queue.filter((p) => p.verifiedPriority === "critical").length
  const pendingAdm     = queue.filter((p) => p.admissionRequested).length

  function getBedNumber(bedId: string | null) {
    if (!bedId) return "N/A"
    return beds.find((b) => b.id === bedId)?.number ?? "N/A"
  }

  async function handleEmergencyOverride(patientId: string, name: string) {
    await emergencyOverride(patientId)
    toast.error(`EMERGENCY: ${name} escalated to Critical — queue reordered`)
    setOverrideTarget(null)
  }

  function handleActivateSurgery() {
    if (!surgeryDuration) { toast.error("Select an estimated duration first"); return }
    setSurgeryMode(true)
    toast.warning(`Surgery Mode activated — ${ASSISTANT_NURSE.name} has been notified`)
  }

  async function handleDeactivateSurgery() {
    setSurgeryMode(false)
    setSurgeryDuration("")
    setRescheduleSlots({})
    await deactivateSharedSurgery()
    toast.success("Surgery Mode deactivated — status restored to Available")
  }

  async function handleEmergencySurgery() {
    const duration = surgeryDuration || "2\u20133 hours"
    setSurgeryMode(true)
    await triggerEmergencySurgery(
      DOCTOR_PROFILE.name,
      duration,
      AFFECTED_APPOINTMENTS.map((a) => ({ id: a.id, patientName: a.patientName, time: a.time, concern: a.concern }))
    )
    setEmergencySurgeryOpen(false)
    toast.error(`EMERGENCY SURGERY initiated — ${ASSISTANT_NURSE.name} has been alerted to reschedule patients`, { duration: 6000 })
  }

  function handleReschedule(apptId: string, slot: string) {
    setRescheduleSlots((prev) => ({ ...prev, [apptId]: slot }))
    const patient = AFFECTED_APPOINTMENTS.find((a) => a.id === apptId)
    toast.success(`${patient?.patientName}'s appointment rescheduled to ${slot}`)
  }

  return (
    <div className="min-h-screen" style={{ background: "#F4FFF8" }}>
      <AppHeader />
      <main className="mx-auto max-w-screen-2xl px-4 py-6 lg:px-8">

        {/* ===== Admin Emergency Alert Banner ===== */}
        {emergencyAlert.active && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-300 bg-red-50 px-4 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Siren className="h-6 w-6 text-red-600 animate-pulse shrink-0" />
              <div>
                <p className="font-bold text-red-800 text-sm">Admin Emergency Alert</p>
                <p className="text-sm text-red-700">{emergencyAlert.message || "Emergency situation \u2014 all staff report immediately."}</p>
                <p className="text-xs text-red-400 mt-0.5">Triggered by {emergencyAlert.triggeredBy}</p>
              </div>
            </div>
            <Button
              size="sm" variant="outline"
              className="shrink-0 border-red-300 text-red-700 hover:bg-red-100"
              onClick={async () => { await dismissEmergencyAlert(); toast.info("Alert acknowledged") }}
            >
              <X className="mr-1 h-3 w-3" />Acknowledge
            </Button>
          </div>
        )}
        {/* Emergency Surgery button — always visible on desktop */}
        <div className="mb-4 hidden lg:flex justify-end">
          <Button
            className="gap-2 text-white font-bold shadow-lg"
            style={{ background: surgeryMode ? "#6b7280" : "linear-gradient(135deg,#ef4444,#b91c1c)" }}
            onClick={() => setEmergencySurgeryOpen(true)}
            disabled={surgeryMode}
          >
            <Siren className={surgeryMode ? "h-4 w-4" : "h-4 w-4 animate-pulse"} />
            {surgeryMode ? "In Emergency Surgery" : "Declare Emergency Surgery"}
          </Button>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Doctor card */}
          <div className="flex items-center gap-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl shrink-0" style={{ background: "linear-gradient(135deg, #6c47ff, #a78bfa)" }}>
              <Stethoscope className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-800">{DOCTOR_PROFILE.name}</p>
                <Badge className={cn("text-xs shrink-0", surgeryMode ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200")}>
                  {surgeryMode ? "In Surgery" : "Available"}
                </Badge>
              </div>
              <p className="text-sm text-violet-600 font-medium">{DOCTOR_PROFILE.specialty}</p>
              <p className="text-xs text-slate-400">Reg: {DOCTOR_PROFILE.reg}</p>
            </div>
          </div>

          {/* Emergency Surgery Button */}
          <div className="lg:hidden mb-2">
            <Button
              className="w-full gap-2 text-white font-bold shadow-lg"
              style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}
              onClick={() => setEmergencySurgeryOpen(true)}
              disabled={surgeryMode}
            >
              <Siren className="h-4 w-4 animate-pulse" />
              {surgeryMode ? "In Emergency Surgery" : "Emergency Surgery"}
            </Button>
          </div>

          {/* Assistant nurse card */}
          <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl shrink-0" style={{ background: "linear-gradient(135deg, #00c896, #34d399)" }}>
              <HeartPulse className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-800">{ASSISTANT_NURSE.name}</p>
                <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                  <UserCheck className="mr-1 h-3 w-3" />Assigned
                </Badge>
              </div>
              <p className="text-xs text-slate-500">Badge: {ASSISTANT_NURSE.badge}</p>
              <p className="text-xs text-slate-400">{ASSISTANT_NURSE.phone}</p>
            </div>
            {surgeryMode && (
              <div className="shrink-0 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-medium">
                Managing queue
              </div>
            )}
          </div>
        </div>

        {/* ===== Surgery Mode Panel ===== */}
        <div className="mb-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <Syringe className={cn("h-5 w-5", surgeryMode ? "text-red-600 animate-pulse" : "text-slate-400")} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Surgery Mode</h3>
                <p className="text-xs text-slate-500">
                  {surgeryMode
                    ? `Active · Est. ${surgeryDuration} · ${ASSISTANT_NURSE.name} is managing the queue`
                    : "Activate to mark yourself unavailable during a surgical procedure"}
                </p>
              </div>
            </div>

            {!surgeryMode ? (
              <div className="flex items-center gap-3">
                <Select value={surgeryDuration} onValueChange={setSurgeryDuration}>
                  <SelectTrigger className="w-40 border-violet-200">
                    <SelectValue placeholder="Est. duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}><Timer className="mr-1.5 h-3.5 w-3.5 inline text-violet-500" />{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="shrink-0 text-white"
                  style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}
                  onClick={handleActivateSurgery}
                >
                  <Syringe className="mr-2 h-4 w-4" />Activate Surgery Mode
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 shrink-0" onClick={handleDeactivateSurgery}>
                Deactivate Surgery Mode
              </Button>
            )}
          </div>

          {/* Affected appointments */}
          {surgeryMode && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">
                  {AFFECTED_APPOINTMENTS.filter((a) => !rescheduleSlots[a.id]).length} appointment(s) need rescheduling
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {AFFECTED_APPOINTMENTS.map((appt) => (
                  <div key={appt.id} className="flex flex-col gap-2 rounded-lg bg-white border border-amber-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{appt.patientName}</p>
                      <p className="text-xs text-slate-500">{appt.time} · {appt.concern}</p>
                    </div>
                    {rescheduleSlots[appt.id] ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                        <CalendarClock className="mr-1 h-3 w-3" />Rescheduled: {rescheduleSlots[appt.id]}
                      </Badge>
                    ) : (
                      <Select onValueChange={(v) => handleReschedule(appt.id, v)}>
                        <SelectTrigger className="w-48 border-amber-200 text-xs h-8">
                          <SelectValue placeholder="Reschedule to…" />
                        </SelectTrigger>
                        <SelectContent>
                          {RESCHEDULE_SLOTS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="In Queue"         value={queue.length}    subtitle="Awaiting consultation" icon={Users} />
          <StatCard title="Critical"         value={criticalCount}   subtitle="Immediate attention"   icon={AlertTriangle} iconClassName={criticalCount > 0 ? "bg-red-100" : undefined} />
          <StatCard title="Admitted"         value={admitted.length} subtitle="Under care"            icon={BedDouble} />
          <StatCard title="Pending Admission" value={pendingAdm}     subtitle="Awaiting approval"     icon={FileText} />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Priority Queue */}
          <div className="lg:col-span-3">
            <Card className="border-violet-100 bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                    <Stethoscope className="h-4 w-4 text-violet-600" />
                    Patient Queue
                    {surgeryMode && (
                      <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 ml-1">
                        {ASSISTANT_NURSE.name} managing
                      </Badge>
                    )}
                  </CardTitle>
                  <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                    {queue.length} patients
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="flex flex-col gap-3">
                    {queue.map((patient, i) => (
                      <div key={patient.id} className={cn("rounded-xl border border-violet-50 border-l-4 bg-white p-4 shadow-sm transition-all hover:shadow-md", priorityBorder[patient.verifiedPriority])}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-sm font-bold text-violet-700">{i + 1}</div>
                            <div>
                              <p className="font-semibold text-slate-800">{patient.name}</p>
                              <p className="text-xs text-slate-400">Token #{patient.tokenNumber} · Age {patient.age} · {patient.wardType} ward</p>
                            </div>
                          </div>
                          <PriorityBadge priority={patient.verifiedPriority} />
                        </div>
                        <div className="mt-3 rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Symptoms</p>
                          <p className="mt-1 text-sm text-slate-700">{patient.symptoms}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTimeAgo(patient.createdAt)}</span>
                          {patient.nurseVerified && <span className="flex items-center gap-1 text-emerald-600"><ShieldCheck className="h-3 w-3" />Nurse Verified</span>}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!patient.admissionRequested && (
                            <Button variant="outline" size="sm" className="h-7 text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
                              onClick={async () => { await requestAdmission(patient.id); toast.success(`Admission requested for ${patient.name} — sent to Admin`) }}
                            >
                              <BedDouble className="mr-1 h-3 w-3" />Request Admission
                            </Button>
                          )}
                          {patient.admissionRequested && (
                            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">Admission Pending</span>
                          )}
                          {patient.verifiedPriority !== "critical" && (
                            <Dialog open={overrideTarget === patient.id} onOpenChange={(open) => setOverrideTarget(open ? patient.id : null)}>
                              <DialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="h-7 text-xs">
                                  <Zap className="mr-1 h-3 w-3" />Emergency Override
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="text-red-700">Confirm Emergency Override</DialogTitle>
                                  <DialogDescription>
                                    This will immediately escalate <strong>{patient.name}</strong> to <strong>Critical</strong> priority, reorder the entire queue, and notify Admin.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="gap-2">
                                  <Button variant="outline" onClick={() => setOverrideTarget(null)}>Cancel</Button>
                                  <Button variant="destructive" onClick={() => handleEmergencyOverride(patient.id, patient.name)}>
                                    <Zap className="mr-1 h-4 w-4" />Confirm Override
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    ))}
                    {queue.length === 0 && (
                      <div className="py-16 text-center text-slate-400">
                        <Users className="mx-auto mb-3 h-8 w-8 opacity-30" />
                        <p className="font-medium">No patients in queue</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Admitted Patients */}
          <div className="lg:col-span-2">
            <Card className="border-violet-100 bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                    <BedDouble className="h-4 w-4 text-violet-600" />Admitted Patients
                  </CardTitle>
                  <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">{admitted.length}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="flex flex-col gap-3">
                    {admitted.map((p) => (
                      <div key={p.id} className="rounded-xl border border-violet-50 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-800">{p.name}</p>
                            <p className="text-xs text-slate-400">Token #{p.tokenNumber} · Age {p.age}</p>
                          </div>
                          <PriorityBadge priority={p.verifiedPriority} />
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />Bed {getBedNumber(p.bedId)}</span>
                          <span className="capitalize">{p.wardType}</span>
                        </div>
                        <div className="mt-2 rounded-lg bg-slate-50 p-2">
                          <p className="text-xs text-slate-500">{p.symptoms}</p>
                        </div>
                        <div className="mt-3">
                          <Button variant="outline" size="sm" className="h-7 text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
                            onClick={async () => { await dischargePatient(p.id); toast.success(`${p.name} discharged`) }}
                          >
                            <LogOut className="mr-1 h-3 w-3" />Discharge
                          </Button>
                        </div>
                      </div>
                    ))}
                    {admitted.length === 0 && (
                      <div className="py-16 text-center text-slate-400">
                        <BedDouble className="mx-auto mb-3 h-8 w-8 opacity-30" />
                        <p className="font-medium">No admitted patients</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* ===== Emergency Surgery Confirmation Dialog ===== */}
      <Dialog open={emergencySurgeryOpen} onOpenChange={setEmergencySurgeryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Siren className="h-5 w-5 animate-pulse" />
              Declare Emergency Surgery
            </DialogTitle>
            <DialogDescription>
              This will immediately:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Set your status to <strong>In Surgery</strong></li>
                <li>Alert <strong>{ASSISTANT_NURSE.name}</strong> to manage the queue</li>
                <li>Open a rescheduling panel on the Nurse dashboard</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-600 mb-2">Estimated duration:</p>
            <Select value={surgeryDuration} onValueChange={setSurgeryDuration}>
              <SelectTrigger className="border-red-200">
                <SelectValue placeholder="Select estimated duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEmergencySurgeryOpen(false)}>Cancel</Button>
            <Button
              className="text-white font-semibold"
              style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}
              onClick={handleEmergencySurgery}
            >
              <Siren className="mr-2 h-4 w-4" />
              Confirm Emergency Surgery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
