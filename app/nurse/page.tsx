"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PriorityBadge } from "@/components/priority-badge"
import { useQueue, SEVERE_ESCALATION_MINUTES } from "@/hooks/use-hospital"
import { verifyPatient, updatePriority } from "@/lib/hospital-store"
import {
  useSurgeryAlert, useEmergencyAlert,
  rescheduleAffectedPatient, dismissEmergencyAlert,
} from "@/lib/appointment-store"
import type { Patient, Priority } from "@/lib/types"
import {
  Users, HeartPulse, ShieldCheck, AlertTriangle, Clock,
  Loader2, Siren, CalendarClock, X, CheckCircle2, Timer, Zap,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/lib/i18n"

// ── Helpers ───────────────────────────────────────────────────────────────────

function minutesWaiting(patient: Patient): number {
  return Math.floor((Date.now() - patient.createdAt.getTime()) / 60000)
}
function escalationMinutesLeft(patient: Patient): number {
  return Math.max(0, SEVERE_ESCALATION_MINUTES - minutesWaiting(patient))
}

// ── Triage Status Badge ───────────────────────────────────────────────────────

function TriageBadge({ patient }: { patient: Patient }) {
  const { t } = useTranslation()
  const p = patient.verifiedPriority
  if (p === "critical") {
    return patient.nurseVerified ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
        <ShieldCheck className="h-3 w-3" /> {t("nurse.verified")}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 border border-red-300 animate-pulse">
        <AlertTriangle className="h-3 w-3" /> {t("nurse.needsVerification")}
      </span>
    )
  }
  if (p === "severe") {
    const left = escalationMinutesLeft(patient)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200">
        <Timer className="h-3 w-3" />
        {left === 0 ? t("nurse.escalating") : t("nurse.escalatesIn", { left })}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
      <CheckCircle2 className="h-3 w-3" /> {t("nurse.autoTokenized")}
    </span>
  )
}

// ── Action Button ─────────────────────────────────────────────────────────────

function ActionBtn({ patient, onVerify }: { patient: Patient; onVerify: (id: string, name: string) => void }) {
  const { t } = useTranslation()
  const p = patient.verifiedPriority
  if (p === "critical" && !patient.nurseVerified) {
    return (
      <Button
        size="sm"
        className="h-8 gap-1.5 text-xs font-bold text-white shadow-sm"
        style={{ background: "linear-gradient(135deg, #ef4444, #b91c1c)" }}
        onClick={() => onVerify(patient.id, patient.name)}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        {t("nurse.verifyAlertAdmin")}
      </Button>
    )
  }
  if (p === "critical" && patient.nurseVerified) {
    return (
      <span className="text-xs text-emerald-600 font-semibold whitespace-nowrap">
        {t("nurse.verifiedAwaiting")}
      </span>
    )
  }
  if (p === "severe") {
    const left = escalationMinutesLeft(patient)
    return (
      <span className="text-xs text-orange-600 font-medium whitespace-nowrap">
        {left === 0 ? t("nurse.autoEscalating") : t("nurse.escalatesWarn", { left })}
      </span>
    )
  }
  return (
    <span className="text-xs text-slate-400 italic whitespace-nowrap">
      {p === "moderate" ? t("nurse.moderateQueued") : t("nurse.mildQueued")}
    </span>
  )
}

const RESCHEDULE_SLOTS = [
  "3:00 PM today", "4:30 PM today", "Tomorrow 10:00 AM",
  "Tomorrow 2:00 PM", "Day after 9:00 AM",
]

export default function NursePage() {
  const [mounted, setMounted] = useState(false)
  const [dismissedSevereIds, setDismissedSevereIds] = useState<Set<string>>(new Set())
  const user   = useAuth()
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => { setMounted(true) }, [])

  // Role guard
  useEffect(() => {
    if (!user) return
    if (user.role === "patient") { router.replace("/patient"); return }
    if (user.role === "doctor")  { router.replace("/doctor");  return }
  }, [user, router])

  // Single hook — no duplicate subscriptions
  const queue          = useQueue()
  const surgeryAlert   = useSurgeryAlert()
  const emergencyAlert = useEmergencyAlert()

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center medical-bg">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  // Stats derived from the single queue source
  const critical    = queue.filter((p) => p.verifiedPriority === "critical").length
  const needsVerify = queue.filter((p) => p.verifiedPriority === "critical" && !p.nurseVerified).length
  const severeCount = queue.filter((p) => p.verifiedPriority === "severe").length

  // Severe patients waiting more than 10 minutes (approaching auto-escalation at 15 min)
  const severeWarningPatients = queue.filter(
    (p) => p.verifiedPriority === "severe" && minutesWaiting(p) >= 10
  )
  const activeSevereWarnings = severeWarningPatients.filter((p) => !dismissedSevereIds.has(p.id))

  function dismissSevereWarning(id: string) {
    setDismissedSevereIds((prev) => new Set(prev).add(id))
  }

  async function handlePriorityChange(id: string, priority: Priority) {
    await updatePriority(id, priority)
    toast.success(t("nurse.priorityUpdated"))
  }

  async function handleVerify(id: string, name: string) {
    await verifyPatient(id)
    toast.success(t("nurse.verifiedToast", { name }), { duration: 5000 })
  }

  return (
    <div className="min-h-screen medical-bg">
      <AppHeader />
      <main className="mx-auto max-w-screen-2xl px-4 py-6 lg:px-8">

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("nurse.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("nurse.subtitle")}
          </p>
        </div>

        {/* Emergency Alert Banner */}
        {emergencyAlert.active && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-300 bg-red-50 px-4 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Siren className="h-6 w-6 text-red-600 animate-pulse shrink-0" />
              <div>
                <p className="font-bold text-red-800 text-sm">{t("nurse.emergencyAlert")}</p>
                <p className="text-sm text-red-700">{emergencyAlert.message || "Emergency situation — all staff report immediately."}</p>
                <p className="text-xs text-red-400 mt-0.5">Triggered by {emergencyAlert.triggeredBy}</p>
              </div>
            </div>
            <Button
              size="sm" variant="outline"
              className="shrink-0 border-red-300 text-red-700 hover:bg-red-100"
              onClick={async () => { await dismissEmergencyAlert(); toast.info("Alert acknowledged") }}
            >
              <X className="mr-1 h-3 w-3" /> {t("nurse.acknowledge")}
            </Button>
          </div>
        )}

        {/* Surgery Alert + Rescheduling Panel */}
        {surgeryAlert.active && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Siren className="h-5 w-5 text-red-600 animate-pulse shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-red-800">{t("nurse.surgeryAlert", { doctor: surgeryAlert.doctorName })}</p>
                <p className="text-sm text-red-700">
                  {t("nurse.surgeryDuration", { duration: surgeryAlert.duration })}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {surgeryAlert.affectedPatients.map((patient) => (
                <div key={patient.id} className="flex flex-col gap-2 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{patient.patientName}</p>
                    <p className="text-xs text-slate-500">{patient.time} · {patient.concern}</p>
                  </div>
                  {patient.rescheduledTo ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <CalendarClock className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                        {t("nurse.rescheduled", { slot: patient.rescheduledTo })}
                      </span>
                    </div>
                  ) : (
                    <Select onValueChange={async (slot) => {
                      await rescheduleAffectedPatient(patient.id, slot)
                      toast.success(`${patient.patientName} rescheduled to ${slot}`)
                    }}>
                      <SelectTrigger className="w-52 border-red-200 text-xs h-8 shrink-0">
                        <SelectValue placeholder={t("nurse.rescheduleTo")} />
                      </SelectTrigger>
                      <SelectContent>
                        {RESCHEDULE_SLOTS.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
              {surgeryAlert.affectedPatients.every((p) => p.rescheduledTo) && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2 text-sm text-emerald-700 font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  {t("nurse.allRescheduled")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ⚠️ Severe Patient Warning Banner */}
        {activeSevereWarnings.length > 0 && (
          <div className="mb-6 rounded-2xl border-2 border-orange-300 bg-orange-50 p-5 shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-orange-900 text-sm uppercase tracking-wide">
                  {t("nurse.severeWarningTitle", { count: activeSevereWarnings.length })}
                </p>
                <p className="text-xs text-orange-700 mt-0.5">
                  {t("nurse.severeWarningDesc", { min: SEVERE_ESCALATION_MINUTES })}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {activeSevereWarnings.map((patient) => {
                const waited = minutesWaiting(patient)
                const left = escalationMinutesLeft(patient)
                return (
                  <div key={patient.id} className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-white p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 shrink-0">
                        #{patient.tokenNumber}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{patient.name}</p>
                        <p className="text-xs text-slate-500 truncate">{patient.symptoms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-orange-700 bg-orange-100 border border-orange-200 rounded-full px-2 py-0.5">
                        {waited}m {t("nurse.severeWaited")}
                      </span>
                      {left > 0 ? (
                        <span className="text-xs font-semibold text-orange-600">
                          {t("nurse.severeAutoIn", { left })}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-red-600 animate-pulse">
                          {t("nurse.severeEscalatingNow")}
                        </span>
                      )}
                      <Button
                        size="sm"
                        className="h-7 text-xs font-bold gap-1"
                        style={{ background: "linear-gradient(135deg, #ea580c, #c2410c)" }}
                        onClick={async () => {
                          await updatePriority(patient.id, "critical")
                          dismissSevereWarning(patient.id)
                          toast.success(t("nurse.severeEscalatedToast", { name: patient.name }))
                        }}
                      >
                        <Zap className="h-3 w-3" />
                        {t("nurse.escalateNow")}
                      </Button>
                      <button
                        onClick={() => dismissSevereWarning(patient.id)}
                        className="rounded-full p-1 text-orange-400 hover:bg-orange-100 hover:text-orange-600 transition-colors"
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title={t("nurse.statInQueue")} value={queue.length}  subtitle={t("nurse.statInQueueSub")}                             icon={Users} />
          <StatCard title={t("nurse.statCritical")} value={critical}      subtitle={t("nurse.statCriticalSub")}                             icon={AlertTriangle} iconClassName={critical > 0 ? "bg-red-100" : undefined} />
          <StatCard title={t("nurse.statNeedsVerify")} value={needsVerify}   subtitle={t("nurse.statNeedsVerifySub")}                    icon={ShieldCheck}   iconClassName={needsVerify > 0 ? "bg-rose-100" : undefined} />
          <StatCard title={t("nurse.statSevereWatch")} value={severeCount}   subtitle={t("nurse.statSevereWatchSub", { min: SEVERE_ESCALATION_MINUTES })} icon={Timer} iconClassName={severeCount > 0 ? "bg-orange-100" : undefined} />
        </div>

        {/* Priority legend */}
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" /> {t("nurse.legendCritical")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700">
            <Timer className="h-3.5 w-3.5" /> {t("nurse.legendSevere", { min: SEVERE_ESCALATION_MINUTES })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700">
            <Clock className="h-3.5 w-3.5" /> {t("nurse.legendModerate")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5" /> {t("nurse.legendMild")}
          </span>
        </div>

        {/* Live Patient Queue — single unified table */}
        <Card className="border-violet-100 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-slate-800">
              <HeartPulse className="h-4 w-4 text-violet-600" />
              {t("nurse.tableTitle")}
              <span className="ml-auto text-xs font-normal text-slate-400">
                {t("nurse.tableSub", { count: queue.length })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-20 pl-4">{t("nurse.colToken")}</TableHead>
                    <TableHead>{t("nurse.colPatient")}</TableHead>
                    <TableHead className="hidden md:table-cell w-14">{t("nurse.colAge")}</TableHead>
                    <TableHead className="w-36">{t("nurse.colPriority")}</TableHead>
                    <TableHead className="w-44">{t("nurse.colTriage")}</TableHead>
                    <TableHead className="hidden lg:table-cell w-28">{t("nurse.colWait")}</TableHead>
                    <TableHead className="text-right pr-4">{t("nurse.colAction")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((patient) => {
                    const isUnverifiedCritical = patient.verifiedPriority === "critical" && !patient.nurseVerified
                    const isVerifiedCritical   = patient.verifiedPriority === "critical" && patient.nurseVerified
                    const isSevere             = patient.verifiedPriority === "severe"

                    return (
                      <TableRow
                        key={patient.id}
                        className={
                          isUnverifiedCritical
                            ? "bg-red-50/70 border-l-4 border-l-red-500"
                            : isVerifiedCritical
                            ? "bg-emerald-50/40 border-l-4 border-l-emerald-400"
                            : isSevere
                            ? "bg-orange-50/40 border-l-4 border-l-orange-400"
                            : "border-l-4 border-l-transparent"
                        }
                      >
                        <TableCell className="pl-4 font-mono text-sm font-bold text-violet-700">
                          #{patient.tokenNumber}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-slate-800 leading-tight">{patient.name}</p>
                          <p className="text-xs text-slate-400 truncate max-w-52 mt-0.5">{patient.symptoms}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-slate-600 text-sm">{patient.age}</TableCell>
                        <TableCell>
                          <Select
                            value={patient.verifiedPriority}
                            onValueChange={(v) => handlePriorityChange(patient.id, v as Priority)}
                          >
                            <SelectTrigger className="h-7 w-28 border-0 p-0 shadow-none focus:ring-0">
                              <PriorityBadge priority={patient.verifiedPriority} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="critical">{t("common.critical")}</SelectItem>
                              <SelectItem value="severe">{t("common.severe")}</SelectItem>
                              <SelectItem value="moderate">{t("common.moderate")}</SelectItem>
                              <SelectItem value="mild">{t("common.mild")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TriageBadge patient={patient} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            ~{patient.estimatedWaitTime} min
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <ActionBtn patient={patient} onVerify={handleVerify} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {queue.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-slate-400">
                        <Users className="mx-auto mb-2 h-10 w-10 opacity-20" />
                        <p className="text-sm font-medium">{t("nurse.noPatients")}</p>
                        <p className="text-xs mt-1">{t("nurse.noPatientsHint")}</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

