"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PriorityBadge } from "@/components/priority-badge"
import { usePatientByToken } from "@/hooks/use-hospital"
import { Hash, Clock, Users, BedDouble, ArrowLeft, QrCode, Info, X } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

interface PatientStatusProps {
  tokenNumber: number
  onBack: () => void
}

export function PatientStatus({ tokenNumber, onBack }: PatientStatusProps) {
  const { t } = useTranslation()
  const patient = usePatientByToken(tokenNumber)
  const [longWaitDismissed, setLongWaitDismissed] = useState(false)

  // Show long-wait popup for mild/moderate patients with estimated wait >= 60 min
  const showLongWaitPopup =
    !longWaitDismissed &&
    patient &&
    patient.status === "in-queue" &&
    (patient.verifiedPriority === "mild" || patient.verifiedPriority === "moderate") &&
    patient.estimatedWaitTime >= 60

  if (!patient) {
    return (
      <Card className="w-full max-w-lg border-border/60">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <QrCode className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="text-lg font-semibold text-foreground">{t("status.notFound")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("status.notFoundMsg", { token: tokenNumber })}</p>
          </div>
          <Button variant="outline" onClick={onBack} className="mt-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.goBack")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isAdmitted = patient.status === "admitted"
  const isDischarged = patient.status === "discharged"
  // Critical + not yet nurse-verified = awaiting verification (no queue position yet)
  const isPendingVerification = patient.verifiedPriority === "critical" && !patient.nurseVerified

  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <Button variant="ghost" onClick={onBack} className="w-fit text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("status.backToReg")}
      </Button>

      {/* Token Card */}
      <Card className="overflow-hidden border-border/60">
        <div className="bg-primary px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-foreground/80">{t("status.yourToken")}</p>
              <p className="text-4xl font-bold tracking-tight text-primary-foreground">#{patient.tokenNumber}</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/20 p-3">
              <Hash className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("common.patientName")}</span>
              <span className="font-medium text-foreground">{patient.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("status.priorityStatus")}</span>
              <PriorityBadge priority={patient.verifiedPriority} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("status.currentStatus")}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold capitalize text-foreground">
                {patient.status === "in-queue" ? t("common.inQueue") : patient.status}
              </span>
            </div>
            {patient.nurseVerified && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("status.nurseVerified")}</span>
                <span className="text-sm font-medium text-emerald-600">{t("status.verified")}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Nurse Verification */}
      {isPendingVerification && (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-amber-800">
              <Clock className="h-4 w-4" />
              {t("status.awaitingVerify")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-amber-900">
              {t("status.criticalFlagged")}
            </p>
            <p className="text-sm text-amber-800 leading-relaxed">
              {t("status.verifyExplain")}
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-100 px-4 py-3 text-xs text-amber-800 font-medium">
              {t("status.verifyWait")}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Long Wait Popup — mild/moderate patients with estimated wait >= 60 min */}
      {showLongWaitPopup && (
        <Card className="border-blue-300 bg-blue-50/80 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2 shrink-0 mt-0.5">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-blue-900 text-sm">
                  {t("status.longWaitTitle")}
                </p>
                <p className="mt-1 text-sm text-blue-800 leading-relaxed">
                  {t("status.longWaitMsg", { wait: patient.estimatedWaitTime })}
                </p>
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-100 px-4 py-2.5 text-xs text-blue-800 font-medium">
                  {t("status.longWaitTip")}
                </div>
              </div>
              <button
                onClick={() => setLongWaitDismissed(true)}
                className="shrink-0 rounded-full p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Position — only for in-queue patients */}
      {!isAdmitted && !isDischarged && !isPendingVerification && (
        <Card className={patient.verifiedPriority === "critical" ? "border-red-400 bg-red-50/60" : "border-border/60"}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className={`h-4 w-4 ${patient.verifiedPriority === "critical" ? "text-red-600" : "text-primary"}`} />
              {t("status.queuePosition")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Critical urgent alert */}
            {patient.verifiedPriority === "critical" && (
              <div className="rounded-lg border border-red-300 bg-red-100 px-4 py-3 flex items-start gap-3">
                <span className="text-red-600 text-lg mt-0.5">🚨</span>
                <div>
                  <p className="text-sm font-bold text-red-700">{t("status.criticalImmediate")}</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {t("status.criticalExplain")}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-end justify-between">
              <div>
                <p className={`text-3xl font-bold ${patient.verifiedPriority === "critical" ? "text-red-700" : "text-foreground"}`}>
                  {patient.queuePosition}
                </p>
                <p className="text-sm text-muted-foreground">{t("status.posLabel")}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{t("status.waitLabel")}</span>
                </div>
                {patient.verifiedPriority === "critical" ? (
                  <p className="text-xl font-bold text-red-600">≤ {patient.estimatedWaitTime} min</p>
                ) : (
                  <p className="text-xl font-semibold text-foreground">{patient.estimatedWaitTime} min</p>
                )}
              </div>
            </div>
            <Progress
              value={Math.max(5, 100 - (patient.queuePosition * 12))}
              className={`h-2 ${patient.verifiedPriority === "critical" ? "[&>div]:bg-red-500" : ""}`}
            />
            <p className="text-xs text-muted-foreground">
              {t("status.queueAutoUpdate")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bed Assignment */}
      {isAdmitted && patient.bedId && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-emerald-800">
              <BedDouble className="h-4 w-4" />
              {t("status.bedAssignment")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-800">{t("common.bed", { id: patient.bedId.replace("bed-", "").toUpperCase() })}</p>
            <p className="mt-1 text-sm text-emerald-700">{t("status.admittedMsg")}</p>
          </CardContent>
        </Card>
      )}

      {/* Discharged */}
      {isDischarged && (
        <Card className="border-muted bg-muted/50">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-semibold text-foreground">{t("status.discharged")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("status.dischargedMsg")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
