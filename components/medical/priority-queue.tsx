"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PriorityBadge } from "@/components/priority-badge"
import { useQueue, usePendingCritical, SEVERE_ESCALATION_MINUTES } from "@/hooks/use-hospital"
import { verifyPatient, requestAdmission, emergencyOverride } from "@/lib/hospital-store"
import { Users, ShieldCheck, BedDouble, Zap, Clock, AlertTriangle, Timer, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n"
import type { Patient, Priority } from "@/lib/types"

const priorityBorderColor: Record<Priority, string> = {
  critical: "border-l-red-500",
  severe:   "border-l-orange-500",
  moderate: "border-l-amber-500",
  mild:     "border-l-emerald-500",
}

function useFormatTimeAgo() {
  const { t } = useTranslation()
  return (date: Date): string => {
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return t("common.justNow")
    if (minutes < 60) return t("common.mAgo", { m: minutes })
    return t("common.hAgo", { h: Math.floor(minutes / 60) })
  }
}

function minutesWaiting(patient: Patient): number {
  return Math.floor((Date.now() - patient.createdAt.getTime()) / 60000)
}
function escalationMinutesLeft(patient: Patient): number {
  return Math.max(0, SEVERE_ESCALATION_MINUTES - minutesWaiting(patient))
}

// ── Triage status badge ───────────────────────────────────────────────────────

function TriageBadge({ patient }: { patient: Patient }) {
  const { t } = useTranslation()
  const p = patient.verifiedPriority
  if (p === "critical") {
    return patient.nurseVerified ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
        <ShieldCheck className="h-3 w-3" /> {t("pq.nurseVerified")}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 border border-red-300 animate-pulse">
        <AlertTriangle className="h-3 w-3" /> {t("pq.verifyRequired")}
      </span>
    )
  }
  if (p === "severe") {
    const left = escalationMinutesLeft(patient)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200">
        <Timer className="h-3 w-3" />
        {left === 0 ? t("pq.escalating") : t("pq.escalatesIn", { left })}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
      <CheckCircle2 className="h-3 w-3" /> {t("pq.autoTokenized")}
    </span>
  )
}

export function PriorityQueue() {
  const queue = useQueue()
  const pendingCritical = usePendingCritical()
  const { t } = useTranslation()
  const formatTimeAgo = useFormatTimeAgo()

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            {t("pq.title")}
          </CardTitle>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {t("common.patients", { count: queue.length })}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[520px]">
          <div className="flex flex-col gap-2">

            {/* ── Awaiting Nurse Verification (critical, not yet in queue) ── */}
            {pendingCritical.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                    {t("pq.awaitingVerify", { count: pendingCritical.length })}
                  </span>
                </div>
                {pendingCritical.map((patient) => (
                  <div
                    key={patient.id}
                    className="mb-2 rounded-lg border border-red-300 border-l-4 border-l-red-600 bg-red-50/60 p-4"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                            !
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{patient.name}</p>
                            <p className="text-xs text-muted-foreground">Token #{patient.tokenNumber} · Age {patient.age}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 border border-red-300 animate-pulse">
                          <AlertTriangle className="h-3 w-3" /> {t("pq.verifyNow")}
                        </span>
                      </div>
                      <div className="rounded-md bg-red-100/60 p-2.5">
                        <p className="text-xs font-medium text-muted-foreground">{t("common.symptoms")}</p>
                        <p className="mt-0.5 text-sm text-foreground">{patient.symptoms}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTimeAgo(patient.createdAt)}</span>
                        <span className="capitalize">{t("common.ward", { type: patient.wardType })}</span>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 bg-red-600 text-white hover:bg-red-700 font-semibold text-xs"
                        onClick={async () => {
                          await verifyPatient(patient.id)
                          toast.success(t("pq.verifyToast", { name: patient.name }))
                        }}
                      >
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        {t("pq.verifyAdd")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {queue.map((patient, index) => (
              <div
                key={patient.id}
                className={cn(
                  "rounded-lg border border-border/40 border-l-4 p-4 transition-all hover:bg-muted/30",
                  priorityBorderColor[patient.verifiedPriority]
                )}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{patient.name}</p>
                        <p className="text-xs text-muted-foreground">Token #{patient.tokenNumber} - Age {patient.age}</p>
                      </div>
                    </div>
                    <PriorityBadge priority={patient.verifiedPriority} />
                  </div>

                  <div className="rounded-md bg-muted/40 p-2.5">
                    <p className="text-xs font-medium text-muted-foreground">{t("common.symptoms")}</p>
                    <p className="mt-0.5 text-sm text-foreground">{patient.symptoms}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(patient.createdAt)}
                    </span>
                    <span className="capitalize">{t("common.ward", { type: patient.wardType })}</span>
                    <TriageBadge patient={patient} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* Only critical patients need manual nurse verification */}
                    {patient.verifiedPriority === "critical" && !patient.nurseVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 font-semibold"
                        onClick={async () => {
                          await verifyPatient(patient.id)
                          toast.success(t("pq.verifyCriticalToast", { name: patient.name }))
                        }}
                      >
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        {t("pq.verifyCritical")}
                      </Button>
                    )}
                    {!patient.admissionRequested && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={async () => {
                          await requestAdmission(patient.id)
                          toast.success(t("pq.admissionToast", { name: patient.name }))
                        }}
                      >
                        <BedDouble className="mr-1 h-3 w-3" />
                        {t("pq.requestAdmission")}
                      </Button>
                    )}
                    {patient.admissionRequested && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {t("pq.admissionPending")}
                      </span>
                    )}
                    {/* Emergency Override only for non-critical patients */}
                    {patient.verifiedPriority !== "critical" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={async () => {
                          await emergencyOverride(patient.id)
                          toast.error(t("pq.emergencyToast", { name: patient.name }))
                        }}
                      >
                        <Zap className="mr-1 h-3 w-3" />
                        {t("pq.emergencyOverride")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {queue.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium">{t("pq.empty")}</p>
                <p className="mt-1 text-xs">{t("pq.emptyHint")}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
