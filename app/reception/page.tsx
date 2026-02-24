"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { StatCard } from "@/components/stat-card"
import { BedGrid } from "@/components/reception/bed-grid"
import { OccupancyChart } from "@/components/reception/occupancy-chart"
import { ActivityLog } from "@/components/reception/activity-log"
import { useStats, usePatients, useBeds } from "@/hooks/use-hospital"
import { admitPatient } from "@/lib/hospital-store"
import { BedDouble, Users, AlertTriangle, Activity, Loader2, Bell, CheckCircle2, XCircle, Clock3, Stethoscope, ShieldCheck, Siren, X, HeartPulse, QrCode, ExternalLink, ClipboardList } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  useAppointmentRequests, useDoctorAvailability, useEmergencyAlert,
  approveAppointmentRequest, rejectAppointmentRequest,
  triggerEmergencyAlert, dismissEmergencyAlert,
  updateDoctorStatus,
  type DoctorStatus,
} from "@/lib/appointment-store"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/lib/i18n"

/* ── Bed Heatmap ──────────────────────────────────────────────────────────── */

function BedHeatmap() {
  const beds = useBeds()
  const { t } = useTranslation()

  const statusColor: Record<string, string> = {
    available:  "bg-emerald-400 hover:bg-emerald-500",
    occupied:   "bg-amber-400  hover:bg-amber-500",
    maintenance:"bg-slate-300  hover:bg-slate-400",
  }

  const legend = [
    { label: t("heatmap.available"),    color: "bg-emerald-400" },
    { label: t("heatmap.occupied"),     color: "bg-amber-400" },
    { label: t("heatmap.icuCritical"), color: "bg-red-500" },
    { label: t("heatmap.maintenance"),  color: "bg-slate-300" },
  ]

  return (
    <Card className="border-slate-100 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-800">
          <BedDouble className="h-4 w-4 text-violet-600" />
          {t("heatmap.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-3">
          {legend.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-600">
              <div className={cn("h-3 w-3 rounded", l.color)} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex flex-col gap-4">
          {["General", "Emergency", "ICU"].map((ward) => {
            const wardBeds = beds.filter((b) =>
              ward === "General"   ? b.type === "general" :
              ward === "Emergency" ? b.type === "emergency" :
              b.type === "icu"
            )
            return (
              <div key={ward}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{ward}</p>
                <div className="flex flex-wrap gap-1.5">
                  {wardBeds.map((bed) => {
                    const isICU = bed.type === "icu"
                    const color =
                      bed.status === "occupied" && isICU ? "bg-red-500 hover:bg-red-600" :
                      statusColor[bed.status] ?? "bg-slate-200"
                    return (
                      <div
                        key={bed.id}
                        title={`${bed.id} — ${bed.status}${bed.patientId ? " (occupied)" : ""}`}
                        className={cn("h-6 w-10 rounded cursor-pointer text-[9px] text-white font-bold flex items-center justify-center transition-colors", color)}
                      >
                        {bed.id.split("-")[1]}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Appointment Requests Panel ───────────────────────────────────────────── */

function AppointmentRequestsPanel() {
  const requests = useAppointmentRequests()
  const { t } = useTranslation()

  function timeAgo(d: Date) {
    const m = Math.floor((Date.now() - d.getTime()) / 60000)
    if (m < 1) return t("common.justNow")
    if (m < 60) return t("common.mAgo", { m })
    return t("common.hAgo", { h: Math.floor(m / 60) })
  }

  return (
    <Card className="border-slate-100 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {t("apptReq.title")}
          <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200 text-xs">
            {t("common.pending", { count: requests.filter((r) => r.status === "pending").length })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {requests.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">{t("apptReq.empty")}</p>
          )}
          {requests.map((req) => (
            <div
              key={req.id}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
                req.status === "pending"
                  ? "border-amber-100 bg-amber-50/60"
                  : req.status === "approved"
                  ? "border-emerald-100 bg-emerald-50/40"
                  : "border-red-100 bg-red-50/30 opacity-70"
              )}
            >
              <div className="flex flex-col gap-0.5">
                <p className="font-semibold text-slate-800 text-sm">{req.patientName}</p>
                <p className="text-xs text-slate-500">{req.doctorName} · {req.specialty} · {req.slot}</p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1"><Clock3 className="h-3 w-3" />{timeAgo(req.requestedAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {req.status === "pending" ? (
                  <>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={async () => {
                        await approveAppointmentRequest(req.id)
                        toast.success(t("apptReq.approveToast", { patient: req.patientName, doctor: req.doctorName }))
                      }}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />{t("common.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                      onClick={async () => {
                        await rejectAppointmentRequest(req.id)
                        toast.error(t("apptReq.rejectToast", { patient: req.patientName }))
                      }}
                    >
                      <XCircle className="mr-1 h-3 w-3" />{t("common.reject")}
                    </Button>
                  </>
                ) : req.status === "approved" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> {t("dappt.approved")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                    <XCircle className="h-3 w-3" /> {t("dappt.rejected")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Doctor Availability Panel ────────────────────────────────────────────── */

function DoctorAvailabilityPanel() {
  const doctors = useDoctorAvailability()
  const { t } = useTranslation()

  const STATUSES: { value: DoctorStatus; label: string }[] = [
    { value: "available",  label: t("docAvail.available") },
    { value: "busy",       label: t("docAvail.busy") },
    { value: "in-surgery", label: t("docAvail.inSurgery") },
    { value: "on-leave",   label: t("docAvail.onLeave") },
  ]

  const statusBadge: Record<DoctorStatus, string> = {
    available:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    busy:       "bg-amber-50  text-amber-700  border-amber-200",
    "in-surgery": "bg-red-50   text-red-600   border-red-200",
    "on-leave": "bg-slate-50 text-slate-500 border-slate-200",
  }

  return (
    <Card className="border-slate-100 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-800">
          <Stethoscope className="h-4 w-4 text-sky-600" />
          {t("docAvail.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {doctors.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{doc.name}</p>
                <p className="text-xs text-slate-500">{doc.specialty}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={cn("text-xs border", statusBadge[doc.status])}>
                  {STATUSES.find((s) => s.value === doc.status)?.label}
                </Badge>
                <Select
                  value={doc.status}
                  onValueChange={async (v) => {
                    await updateDoctorStatus(doc.id, v as DoctorStatus)
                    toast.success(t("docAvail.toast", { name: doc.name, status: v }))
                  }}
                >
                  <SelectTrigger className="h-7 w-28 text-xs border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Patient Allocation Panel ────────────────────────────────────────────── */

function PatientAllocationPanel({
  patients, beds,
}: { patients: ReturnType<typeof usePatients>; beds: ReturnType<typeof useBeds> }) {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [selPatient, setSelPatient]     = useState<(typeof patients)[0] | null>(null)
  const [selBedId, setSelBedId]         = useState("")
  const [loading, setLoading]           = useState(false)

  // All patients that a doctor has flagged for admission, still in-queue
  const pending = patients
    .filter((p) => p.admissionRequested && p.status === "in-queue")
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, severe: 1, moderate: 2, mild: 3 }
      return (order[a.verifiedPriority] ?? 3) - (order[b.verifiedPriority] ?? 3)
    })

  const availableBeds = beds.filter((b) => b.status === "available")

  const priorityStyle: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border-red-300",
    severe:   "bg-orange-100 text-orange-700 border-orange-200",
    moderate: "bg-yellow-100 text-yellow-700 border-yellow-200",
    mild:     "bg-green-100 text-green-700 border-green-200",
  }

  function openDialog(p: typeof selPatient) {
    setSelPatient(p)
    setSelBedId("")
    setDialogOpen(true)
  }

  async function handleConfirm() {
    if (!selPatient || !selBedId) { toast.error(t("admin.selectBedFirst")); return }
    setLoading(true)
    await admitPatient(selPatient.id, selBedId)
    const bed = availableBeds.find((b) => b.id === selBedId)
    toast.success(t("admin.admitToast", { name: selPatient.name, bed: String(bed?.number) }))
    setDialogOpen(false)
    setLoading(false)
  }

  return (
    <>
      <Card className="border-slate-100 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-slate-800">
            <ClipboardList className="h-4 w-4 text-violet-600" />
            {t("alloc.title")}
            {pending.length > 0 && (
              <Badge className="ml-1 bg-amber-100 text-amber-700 border-amber-200 text-xs">
                {t("common.pending", { count: pending.length })}
              </Badge>
            )}
            <span className="ml-auto text-xs font-normal text-slate-400">
              {t("alloc.bedCount", { count: availableBeds.length })}
            </span>
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("alloc.desc")}
          </p>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <BedDouble className="mx-auto mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">{t("alloc.empty")}</p>
              <p className="text-xs mt-1">{t("alloc.emptyHint")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-bold uppercase ${priorityStyle[p.verifiedPriority] ?? "bg-slate-100 text-slate-600"}`}>
                        {p.verifiedPriority}
                      </span>
                      {p.nurseVerified && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> {t("alloc.nurseVerified")}
                        </span>
                      )}
                      <span className="rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs font-semibold text-violet-700 flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" /> {t("alloc.doctorRecommended")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Token #{p.tokenNumber} · Age {p.age} · {p.wardType} ward
                    </p>
                    <p className="text-sm text-slate-600 italic">{p.symptoms}</p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 h-9 gap-2 text-white font-semibold text-sm shadow-sm"
                    style={{ background: "linear-gradient(135deg, #6c47ff, #a78bfa)" }}
                    onClick={() => openDialog(p)}
                  >
                    <BedDouble className="h-4 w-4" />
                    {t("alloc.assignAdmit")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bed Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <BedDouble className="h-5 w-5 text-violet-600" />
              {t("alloc.dialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("alloc.dialogDesc", { name: selPatient?.name ?? "", token: selPatient?.tokenNumber ?? "" })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            {availableBeds.length === 0 ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center">
                <p className="text-sm font-semibold text-red-700">{t("alloc.noBedsError")}</p>
                <p className="text-xs text-red-500 mt-1">{t("alloc.noBedsHint")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-emerald-700">{availableBeds.length}</span> available bed{availableBeds.length !== 1 ? "s" : ""}
                </p>
                <Select value={selBedId} onValueChange={setSelBedId}>
                  <SelectTrigger className="border-violet-200 focus:border-violet-400">
                    <SelectValue placeholder={t("alloc.selectBed")} />
                  </SelectTrigger>
                  <SelectContent>
                    {["general", "emergency", "icu"].map((type) => {
                      const typeBeds = availableBeds.filter((b) => b.type === type)
                      if (typeBeds.length === 0) return null
                      return (
                        <>
                          <div key={type} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{type} ward</div>
                          {typeBeds.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              Bed {b.number} · Floor {b.floor} — {b.type}
                            </SelectItem>
                          ))}
                        </>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!selBedId || loading || availableBeds.length === 0}
              className="gap-2 text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #6c47ff, #a78bfa)" }}
              onClick={handleConfirm}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BedDouble className="h-4 w-4" />}
              {t("alloc.confirmAdmission")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ── Main Page ────────────────────────────────────────────────────────────── */

export default function ReceptionPage() {
  const [mounted, setMounted]               = useState(false)
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const [alertMessage, setAlertMessage]     = useState("")
  const [patientUrl, setPatientUrl]         = useState("")
  const [selectedBeds, setSelectedBeds]     = useState<Record<string, string>>({})

  const user   = useAuth()
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    setMounted(true)
    setPatientUrl(window.location.origin)
  }, [])

  // Role guard: only admins may access this page
  useEffect(() => {
    if (!user) return
    if (user.role === "patient") { router.replace("/patient"); return }
    if (user.role === "nurse")   { router.replace("/nurse");   return }
    if (user.role === "doctor")  { router.replace("/doctor");  return }
  }, [user, router])

  const stats          = useStats()
  const patients        = usePatients()
  const beds            = useBeds()
  const emergencyAlert  = useEmergencyAlert()

  // ALL patients flagged for admission (any priority) — used for tab badge + top alert
  const allAdmissionPending = patients.filter(
    (p) => p.admissionRequested && p.status === "in-queue"
  )
  // Critical-only subset for the top urgent alert
  const bedRequests = allAdmissionPending.filter(
    (p) => p.verifiedPriority === "critical" && p.nurseVerified
  )

  const inQueueCount  = patients.filter((p) => p.status === "in-queue").length
  const admittedCount = patients.filter((p) => p.status === "admitted").length

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center medical-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm text-slate-500">{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen medical-bg">
      <AppHeader />
      <main className="mx-auto max-w-screen-2xl px-4 py-6 lg:px-8">

        {/* Header row */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("admin.title")}</h1>
            <p className="mt-1 text-sm text-slate-500">{t("admin.subtitle")}</p>
          </div>
          <Button
            className="shrink-0 gap-2 text-white font-semibold shadow-lg"
            style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}
            onClick={() => setAlertDialogOpen(true)}
          >
            <Siren className="h-4 w-4" />
            {t("admin.emergencyBtn")}
          </Button>
        </div>

        {/* Critical Bed Allocation Alerts */}
        {bedRequests.length > 0 && (
          <div className="mb-6 rounded-2xl border-2 border-red-400 bg-red-50 p-5 shadow-md">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 shrink-0">
                <BedDouble className="h-5 w-5 text-red-600 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-red-800 text-base">{t("admin.criticalNeedBed")}</p>
                <p className="text-sm text-red-600">{t("admin.criticalNeedBedDesc", { count: bedRequests.length })}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {bedRequests.map((p) => {
                const availableBeds = beds.filter((b) => b.status === "available")
                const chosenBedId   = selectedBeds[p.id] ?? ""
                return (
                  <div key={p.id} className="flex flex-col gap-3 rounded-xl border border-red-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 border border-red-300">CRITICAL</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">Nurse Verified</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">Token #{p.tokenNumber} · Age {p.age} · {p.wardType} ward</p>
                      <p className="mt-1 text-sm text-slate-600 italic">{p.symptoms}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {availableBeds.length === 0 ? (
                        <span className="text-xs text-red-600 font-semibold">{t("admin.noBeds")}</span>
                      ) : (
                        <>
                          <Select
                            value={chosenBedId}
                            onValueChange={(v) => setSelectedBeds((prev) => ({ ...prev, [p.id]: v }))}
                          >
                            <SelectTrigger className="h-8 w-44 border-violet-200 text-xs">
                              <SelectValue placeholder={t("admin.assignBed")} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableBeds.map((b) => (
                                <SelectItem key={b.id} value={b.id} className="text-xs">
                                  Bed {b.number} ({b.type}) · Floor {b.floor}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            disabled={!chosenBedId}
                            className="h-8 text-xs text-white font-semibold disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #6c47ff, #a78bfa)" }}
                            onClick={async () => {
                              if (!chosenBedId) { toast.error(t("admin.selectBedFirst")); return }
                              await admitPatient(p.id, chosenBedId)
                              const bedNum = availableBeds.find((b) => b.id === chosenBedId)?.number
                              toast.success(t("admin.admitToast", { name: p.name, bed: String(bedNum) }))
                              setSelectedBeds((prev) => { const n = { ...prev }; delete n[p.id]; return n })
                            }}
                          >
                            <BedDouble className="mr-1 h-3 w-3" />{t("admin.admit")}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Active Emergency Alert Banner */}
        {emergencyAlert.active && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Siren className="h-5 w-5 text-red-600 animate-pulse" />
              <div>
                <p className="font-bold text-red-800">{t("admin.alertActive")}</p>
                <p className="text-sm text-red-700">{emergencyAlert.message || t("admin.alertAllNotified")}</p>
                <p className="text-xs text-red-500 mt-0.5">{t("admin.triggeredBy", { by: emergencyAlert.triggeredBy })}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-red-300 text-red-700 hover:bg-red-100"
              onClick={async () => { await dismissEmergencyAlert(); toast.info(t("admin.alertDismissed")) }}
            >
              <X className="mr-1 h-3 w-3" />{t("common.dismiss")}
            </Button>
          </div>
        )}

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title={t("admin.statTotal")}   value={stats.totalBeds}    subtitle={t("admin.statTotalSub", { count: stats.availableBeds })}        icon={BedDouble} />
          <StatCard title={t("admin.statInQueue")}  value={inQueueCount}        subtitle={t("admin.statInQueueSub")}                          icon={Users} />
          <StatCard title={t("admin.statAdmitted")} value={admittedCount}       subtitle={t("admin.statAdmittedSub", { rate: stats.occupancyRate })}       icon={Activity} />
          <StatCard title={t("admin.statICU")} value={stats.icuBeds.available} subtitle={t("admin.statICUSub", { total: stats.icuBeds.total })} icon={AlertTriangle} iconClassName={stats.icuBeds.available === 0 ? "bg-red-100" : undefined} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="requests" className="flex flex-col gap-6">
          <TabsList className="w-fit bg-white border border-slate-100 shadow-sm flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="requests">{t("admin.tabRequests")}</TabsTrigger>
            <TabsTrigger value="allocation" className="flex items-center gap-1.5 relative">
              <ClipboardList className="h-3.5 w-3.5" />
              {t("admin.tabAllocation")}
              {allAdmissionPending.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                  {allAdmissionPending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="heatmap">{t("admin.tabHeatmap")}</TabsTrigger>
            <TabsTrigger value="doctors">{t("admin.tabDoctors")}</TabsTrigger>
            <TabsTrigger value="beds">{t("admin.tabBeds")}</TabsTrigger>
            <TabsTrigger value="analytics">{t("admin.tabAnalytics")}</TabsTrigger>
            <TabsTrigger value="activity">{t("admin.tabActivity")}</TabsTrigger>
            <TabsTrigger value="qr" className="flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5" />{t("admin.tabQR")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests"><AppointmentRequestsPanel /></TabsContent>
          <TabsContent value="allocation">
            <PatientAllocationPanel patients={patients} beds={beds} />
          </TabsContent>
          <TabsContent value="heatmap"><BedHeatmap /></TabsContent>
          <TabsContent value="doctors"><DoctorAvailabilityPanel /></TabsContent>
          <TabsContent value="beds"><BedGrid /></TabsContent>
          <TabsContent value="analytics"><OccupancyChart /></TabsContent>
          <TabsContent value="activity"><ActivityLog /></TabsContent>
          <TabsContent value="qr">
            <Card className="border-slate-100 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                  <QrCode className="h-4 w-4 text-violet-600" />
                  {t("qr.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-6 py-4">
                  <p className="text-sm text-slate-500 text-center max-w-md">
                    {t("qr.desc")}
                  </p>
                  {patientUrl && (
                    <div className="rounded-2xl bg-white p-5 shadow-lg border border-slate-100">
                      <QRCodeSVG
                        value={patientUrl}
                        size={220}
                        bgColor="#ffffff"
                        fgColor="#1e1040"
                        level="H"
                        imageSettings={{
                          src: "/Netralogo.png",
                          height: 36,
                          width: 36,
                          excavate: true,
                        }}
                      />
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <p className="font-mono text-xs text-slate-400">{patientUrl}</p>
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
                        onClick={() => window.open("/kiosk", "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("qr.kiosk")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50"
                        onClick={() => window.print()}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        {t("qr.print")}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Emergency Alert Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Siren className="h-5 w-5" />
              {t("alertDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("alertDialog.desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder={t("alertDialog.placeholder")}
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              rows={3}
              className="resize-none border-red-200 focus:border-red-400"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button
              className="text-white font-semibold"
              style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}
              onClick={async () => {
                await triggerEmergencyAlert(alertMessage || t("alertDialog.defaultMsg"))
                toast.error(t("alertDialog.toast"), { duration: 5000 })
                setAlertDialogOpen(false)
                setAlertMessage("")
              }}
            >
              <Siren className="mr-2 h-4 w-4" />
              {t("alertDialog.issue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
